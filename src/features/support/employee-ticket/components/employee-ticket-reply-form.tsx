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
      <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
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
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Textarea
          rows={4}
          maxLength={MAX_EMPLOYEE_TICKET_MESSAGE}
          placeholder="Write your reply — the employee is pushed this on their device."
          {...form.register('body')}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {attachment && (
        <div className="flex w-fit items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <input
            ref={fileInput}
            type="file"
            accept={SUPPORT_ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={(event) => void pickFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip className="size-4" />
            Attach a file
          </Button>
        </div>

        <Button type="submit" disabled={isPending}>
          <SendHorizontal className="size-4" />
          {isPending ? 'Sending…' : 'Send Reply'}
        </Button>
      </div>
    </form>
  )
}
