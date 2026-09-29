import { FileUploader } from 'react-drag-drop-files'
import { Eye, UploadCloud, X } from 'lucide-react'
import type { DropzoneFile } from '@/components/common/file-dropzone'
import { ImageLightbox } from '@/components/common/image-lightbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { checkFileContent } from '@/lib/file-signature'
import { toasterrormsg } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useFilePreview } from '@/hooks/use-file-preview'
import { MAX_PROOF_FILES } from '../constants'
import { formatFileSize, proofKind } from '../lib/proof-kind'

/** The formats `POST /user/uploads/office-task-proof` signs for, as the picker filters them. */
const TYPES = ['JPG', 'JPEG', 'PNG', 'WEBP', 'PDF', 'DOC', 'DOCX', 'XLS', 'XLSX']

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * The hand-in's proof field: a slim drop bar, then one row per picked file —
 * a thumbnail (or a format tile), the name, its size and type, preview and
 * remove. Every file previews in the app's own lightbox; nothing opens a tab.
 * The bar disappears once the cap is reached.
 */
export function ProofUploader({
  value,
  onChange,
  maxFiles = MAX_PROOF_FILES,
  maxSizeMB = 5,
  invalid = false,
}: {
  value: DropzoneFile[]
  onChange: (value: DropzoneFile[]) => void
  maxFiles?: number
  maxSizeMB?: number
  /** Draw the drop bar in the error colour (a required field left empty). */
  invalid?: boolean
}) {
  const preview = useFilePreview(value)
  const room = maxFiles - value.length

  const take = async (picked: FileList | File[] | File) => {
    const incoming = picked instanceof File ? [picked] : Array.from(picked)
    if (!incoming.length) return
    if (room <= 0) {
      toasterrormsg(`You can add at most ${maxFiles} files.`)
      return
    }
    const accepted: DropzoneFile[] = []
    for (const file of incoming) {
      if (accepted.length >= room) {
        toasterrormsg(`Only ${maxFiles} files allowed — extra files were skipped.`)
        break
      }
      // A renamed file: the extension says one thing, the bytes another.
      const mismatch = await checkFileContent(file)
      if (mismatch) {
        toasterrormsg(`${file.name}: ${mismatch}`)
        continue
      }
      accepted.push({ name: file.name, url: await readAsDataUrl(file), file })
    }
    if (accepted.length) onChange([...value, ...accepted])
  }

  const removeAt = (index: number) => {
    // The slides shift under the viewer — close it rather than show the wrong file.
    preview.close()
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {room > 0 && (
        <FileUploader
          handleChange={(files: File | File[] | FileList) => {
            take(files).catch(() => toasterrormsg("Couldn't read that file. Try again."))
          }}
          name="proof"
          types={TYPES}
          multiple
          maxSize={maxSizeMB}
          hoverTitle=" "
          onTypeError={() => toasterrormsg('That file type is not supported.')}
          onSizeError={() => toasterrormsg(`A file is too large. Maximum size is ${maxSizeMB} MB.`)}
          dropMessageStyle={{ display: 'none' }}
          classes="sa-file-drop"
        >
          <div
            className={cn(
              'flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors',
              'hover:border-primary/50 hover:bg-primary/5',
              invalid ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/20',
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                Drop files here or <span className="text-primary underline-offset-2 hover:underline">browse</span>
              </span>
              <span className="block text-xs text-muted-foreground">
                Photos, PDF, Word or Excel · up to {maxSizeMB} MB each
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {value.length}/{maxFiles}
            </span>
          </div>
        </FileUploader>
      )}

      {value.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {value.map((file, i) => {
            const kind = proofKind(file.name, file.file?.type)
            const Icon = kind.icon
            return (
              <li key={`${file.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => preview.open(i)}
                  aria-label={`Preview ${file.name}`}
                  className="size-10 shrink-0 cursor-zoom-in overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {kind.kind === 'image' ? (
                    <img src={file.url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className={cn('grid size-full place-items-center', kind.tone)}>
                      <Icon className="size-5" />
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {kind.label}
                    {file.file && ` · ${formatFileSize(file.file.size)}`}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => preview.open(i)}
                      aria-label={`Preview ${file.name}`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Eye className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Preview</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      aria-label={`Remove ${file.name}`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Remove</TooltipContent>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      )}

      <ImageLightbox
        slides={preview.slides}
        index={preview.index}
        onIndexChange={preview.setIndex}
        onClose={preview.close}
      />
    </div>
  )
}
