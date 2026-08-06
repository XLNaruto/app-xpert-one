import { useRef, useState } from 'react'
import { Eye, Loader2, Upload } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { DOCUMENT_ACCEPT } from '../constants'

/**
 * The attachment file field: the chosen file's name, with an upload button beside
 * it — sized to sit in a card's field grid alongside the selects.
 *
 * The form holds the storage **key**, not the file: picking one uploads it to
 * storage on a presigned PUT and the key comes back, which is all the attachment row
 * stores. So the upload is durable before the row it belongs to is saved.
 *
 * Replacing a file uploads a new object and swaps the key. The old object stays where
 * it is — the API exposes no way to remove one — so a replaced file is orphaned
 * rather than deleted, which is worth knowing when auditing storage.
 */
export function DocumentFileField({
  value,
  onPick,
  isUploading,
  disabled = false,
}: {
  /** The stored object key, or `''` for nothing uploaded yet. */
  value: string
  /** Uploads the file and answers its object key. */
  onPick: (file: File) => Promise<string>
  isUploading: boolean
  /**
   * Blocks picking — the presign needs the card's document type, so the field waits
   * for it rather than failing the upload.
   */
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pickedName, setPickedName] = useState('')
  const fileUrl = useMediaUrl(value)

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
        <span className="truncate">
          {name || (disabled ? 'Select a document type first' : 'Choose file…')}
        </span>
      </button>

      {value && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Preview the uploaded file"
              className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/20 hover:ring-primary/40"
            >
              <Eye className="size-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>Preview file</TooltipContent>
        </Tooltip>
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
          {disabled
            ? 'Choose a document type first'
            : value
              ? 'Replace file'
              : 'PDF, JPG, PNG or WebP'}
        </TooltipContent>
      </Tooltip>

      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(event) => void pick(event.target.files?.[0])}
      />
    </div>
  )
}
