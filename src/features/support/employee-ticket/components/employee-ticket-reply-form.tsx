import { useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Paperclip, SendHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toasterrormsg } from '@/lib/toast'
import { checkFileContent } from '@/lib/file-signature'
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_MAX_MB,
} from '../constants'
import {
  MAX_EMPLOYEE_TICKET_MESSAGE,
  SUPPORT_ATTACHMENT_CONTENT_TYPES,
  type EmployeeTicketReplyFormValues,
} from '../schemas'

interface EmployeeTicketReplyFormProps {
  form: UseFormReturn<EmployeeTicketReplyFormValues>
  error?: string
  onSubmit: () => void
  attachment: File | null
  onAttachmentChange: (file: File | null) => void
  isPending: boolean
  /** A closed thread is over on both sides — the composer says so instead. */
  disabled: boolean
}

/**
 * The office's reply composer.
 *
 * The file is held here until Send and only then presigned and PUT, so an
 * abandoned reply leaves no stray object in the bucket. The type is checked
 * before it's accepted rather than after the presign refuses it — the endpoint
 * signs for images and PDFs and nothing else.
 */
export function EmployeeTicketReplyForm({
  form,
  error,
  onSubmit,
  attachment,
  onAttachmentChange,
  isPending,
  disabled,
}: EmployeeTicketReplyFormProps) {
  const fileInput = useRef<HTMLInputElement>(null)

  const pickFile = async (file: File | null) => {
    if (!file) {
      onAttachmentChange(null)
      return
    }
    if (!SUPPORT_ATTACHMENT_CONTENT_TYPES.includes(file.type as never)) {
      toasterrormsg('Attach a JPG, PNG, WebP or PDF.')
      return
    }
    if (file.size > SUPPORT_ATTACHMENT_MAX_MB * 1024 * 1024) {
      toasterrormsg(`Keep the file under ${SUPPORT_ATTACHMENT_MAX_MB} MB.`)
      return
    }
    // Both checks above read the file name; this one reads the file.
    const mismatch = await checkFileContent(file, SUPPORT_ATTACHMENT_CONTENT_TYPES)
    if (mismatch) {
      toasterrormsg(mismatch)
      return
    }
    onAttachmentChange(file)
  }

  if (disabled) {
    return (
      <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        This ticket is closed. The thread is over on both sides — the employee
        would never be told about a reply sent now.
      </p>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-2"
    >
      {/* One composer bar: the attach button, the message and Send sit in the
          same box, the way a chat input does. */}
      <div className="rounded-2xl border bg-background p-2 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
        {attachment && (
          <div className="mb-2 flex w-fit items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm">
            <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="max-w-64 truncate">{attachment.name}</span>
            <button
              type="button"
              aria-label="Remove attachment"
              onClick={() => {
                onAttachmentChange(null)
                if (fileInput.current) fileInput.current.value = ''
              }}
              className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={SUPPORT_ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={(event) => void pickFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Attach a file"
            title="Attach a JPG, PNG, WebP or PDF"
            className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip className="size-4" />
          </Button>

          <Textarea
            rows={1}
            maxLength={MAX_EMPLOYEE_TICKET_MESSAGE}
            placeholder="Write your reply — the employee is pushed this on their device."
            // Enter sends, Shift+Enter breaks the line: a chat's muscle memory.
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (!isPending) onSubmit()
              }
            }}
            className="max-h-40 min-h-[2.5rem] resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0"
            {...form.register('body')}
          />

          <Button
            type="submit"
            size="icon"
            aria-label="Send reply"
            disabled={isPending}
            className="shrink-0 rounded-full"
          >
            <SendHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Enter to send · Shift + Enter for a new line
          </p>
        )}
        {isPending && <p className="text-xs text-muted-foreground">Sending…</p>}
      </div>
    </form>
  )
}
