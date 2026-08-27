import { useMemo, useRef, useState } from 'react'
import { Eye, Loader2, Upload, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ImageLightbox } from '@/components/common/image-lightbox'
import { useFilePreview } from '@/hooks/use-file-preview'
import { cn } from '@/lib/utils'
import { LEAVE_ATTACHMENT_ACCEPT } from '../constants'

/**
 * The proof file on a leave — a medical certificate, typically.
 *
 * The form holds the storage **key**, never the file: picking one uploads it on a
 * presigned PUT and the key comes back, which is all the leave row stores. So the
 * file is durable before the record it belongs to is saved, and an abandoned pick
 * leaves a stray object rather than a half-saved row.
 *
 * Clearing the field drops the key from the record. The object stays in storage —
 * the API exposes no way to remove one — so a replaced or cleared file is orphaned
 * rather than deleted, which is worth knowing when auditing storage.
 */
export function LeaveAttachmentField({
  value,
  onPick,
  onClear,
  isUploading,
  disabled = false,
}: {
  /** The stored object key, or `''` for nothing uploaded yet. */
  value: string
  /** Uploads the file and answers its object key. */
  onPick: (file: File) => Promise<string>
  onClear: () => void
  isUploading: boolean
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pickedName, setPickedName] = useState('')

  const pick = async (file: File | undefined) => {
    if (!file) return
    setPickedName(file.name)
    try {
      await onPick(file)
    } catch {
      // The hook toasts the failure; clear the name so the field doesn't claim a
      // file that was never stored.
      setPickedName('')
    }
  }

  /** The last path segment of the key — the stored file's own name. */
  const storedName = value ? (value.split('/').pop() ?? value) : ''
  const name = pickedName || storedName

  // The eye opens the file in the app's viewer — a PDF embedded, an image
  // zoomable — instead of handing the form's tab over to the browser.
  const files = useMemo(
    () => (value ? [{ name: storedName, url: value }] : []),
    [value, storedName],
  )
  const preview = useFilePreview(files)

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading || disabled}
        className={cn(
          'flex h-9 min-w-0 flex-1 items-center rounded-md border border-dashed border-input px-3 text-left text-sm transition-colors hover:border-ring/50',
          name ? 'text-foreground' : 'text-muted-foreground',
          isUploading ? 'cursor-wait' : 'cursor-pointer',
          disabled && 'cursor-not-allowed opacity-60 hover:border-input',
        )}
      >
        <span className="truncate">{name || 'Choose file…'}</span>
      </button>

      {value && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => preview.open(0)}
                aria-label="Preview the uploaded file"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/20 hover:ring-primary/40"
              >
                <Eye className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Preview file</TooltipContent>
          </Tooltip>

          {!disabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setPickedName('')
                    onClear()
                  }}
                  aria-label="Remove the attachment"
                  className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Remove attachment</TooltipContent>
            </Tooltip>
          )}
        </>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading || disabled}
            aria-label={value ? 'Replace the file' : 'Upload a file'}
            className={cn(
              'grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              isUploading && 'cursor-wait',
              disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
            )}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {value ? 'Replace file' : 'PDF, JPG, PNG or WebP'}
        </TooltipContent>
      </Tooltip>

      <input
        ref={inputRef}
        type="file"
        accept={LEAVE_ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(event) => void pick(event.target.files?.[0])}
      />

      <ImageLightbox
        slides={preview.slides}
        index={preview.index}
        onIndexChange={preview.setIndex}
        onClose={preview.close}
      />
    </div>
  )
}
