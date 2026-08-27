import { FileUploader } from 'react-drag-drop-files'
import { FileText, Plus, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toasterrormsg } from '@/lib/toast'
import { checkFileContent } from '@/lib/file-signature'
import { useMediaResolver } from '@/hooks/use-media-url'
import { isImageFile, useFilePreview } from '@/hooks/use-file-preview'
import { ImageWithFallback } from './image-with-fallback'
import { ImageLightbox } from './image-lightbox'
import type { DropzoneFile } from './file-dropzone'

interface MultiFileDropzoneProps {
  value: DropzoneFile[]
  onChange: (value: DropzoneFile[]) => void
  accept?: string
  maxSizeMB?: number
  maxFiles?: number
  label?: string
  hint?: string
  className?: string
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Translate an `accept` mime/extension string into the uppercase extension list
 * `react-drag-drop-files` expects (e.g. `image/*` → JPG/PNG/…). Returns
 * `undefined` (accept anything) when nothing usable is given.
 */
function acceptToTypes(accept?: string): string[] | undefined {
  if (!accept) return undefined
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  const types = new Set<string>()
  for (const token of tokens) {
    if (token === 'image/*') ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG', 'AVIF'].forEach((t) => types.add(t))
    else if (token === 'application/pdf' || token === '.pdf') types.add('PDF')
    else if (token.startsWith('.')) types.add(token.slice(1).toUpperCase())
  }
  return types.size ? Array.from(types) : undefined
}

/**
 * Multi-file drag-and-drop field built on `react-drag-drop-files`. Picked files
 * are surfaced as {@link DropzoneFile}s; images render as square thumbnails and
 * other files as full-width document bars, each removable. Respects `maxFiles`.
 */
export function MultiFileDropzone({
  value,
  onChange,
  accept = 'image/*',
  maxSizeMB,
  maxFiles,
  label = 'Add files',
  hint,
  className,
}: MultiFileDropzoneProps) {
  const types = acceptToTypes(accept)
  // Resolves each stored file's path against the media base URL; the `data:`
  // URLs of freshly picked files pass through untouched.
  const resolveMedia = useMediaResolver()
  // Clicking any tile opens the whole set in the app's viewer — images and PDFs
  // in one carousel — rather than throwing the file at a new tab.
  const preview = useFilePreview(value)

  const take = async (fileList: File[]) => {
    const incoming = fileList
    if (!incoming.length) return
    const room = maxFiles ? maxFiles - value.length : Infinity
    if (room <= 0) {
      toasterrormsg(`You can add at most ${maxFiles} file${maxFiles === 1 ? '' : 's'}.`)
      return
    }

    const accepted: DropzoneFile[] = []
    for (const file of incoming) {
      if (accepted.length >= room) {
        toasterrormsg(
          `Only ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed — extra files were skipped.`,
        )
        break
      }
      // Extension says one thing, bytes another — a renamed file. Skip it and
      // say so, the rest of the batch still goes through.
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
    // The slides are about to shift under the viewer; close it rather than
    // leave it showing whatever slid into that position.
    preview.close()
    onChange(value.filter((_, i) => i !== index))
  }

  const isEmpty = value.length === 0
  const canAdd = !maxFiles || value.length < maxFiles
  // When the only content is document(s) (e.g. a single RC-book PDF), let the
  // tile grow to fill the whole dropzone box instead of a short strip.
  const onlyDocs = value.length > 0 && value.every((f) => !isImageFile(f))

  const uploaderProps = {
    handleChange: (files: File | File[]) =>
      void take(Array.isArray(files) ? files : [files]),
    name: 'file',
    types,
    multiple: true,
    maxSize: maxSizeMB,
    hoverTitle: ' ',
    onTypeError: () => toasterrormsg('That file type is not supported.'),
    onSizeError: () =>
      toasterrormsg(`A file is too large. Maximum size is ${maxSizeMB} MB.`),
    dropMessageStyle: { display: 'none' } as const,
    classes: 'sa-file-drop',
  }

  if (isEmpty) {
    return (
      <FileUploader {...uploaderProps}>
        <div
          className={cn(
            'flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-5 text-center transition-colors',
            'hover:border-primary/50 hover:bg-primary/5',
            className,
          )}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadCloud className="size-4" />
          </span>
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">
            Click to browse or drag &amp; drop
          </span>
        </div>
      </FileUploader>
    )
  }

  // Populated: the thumbnail grid lives OUTSIDE any <FileUploader> so the
  // per-file remove/preview buttons work (the library wraps its children in a
  // <label>, which would otherwise re-open the picker on every click). Only the
  // "Add" tile is a FileUploader, so click/drop still adds more files.
  return (
    <div
      className={cn(
        'flex min-h-44 flex-col rounded-lg border-2 border-dashed border-border bg-muted/20 p-3',
        className,
      )}
    >
      <div
        className={cn(
          'grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2',
          onlyDocs ? 'flex-1 auto-rows-fr' : 'auto-rows-min content-start',
        )}
      >
        {value.map((file, i) => {
          const image = isImageFile(file)
          return (
            <div
              key={`${file.name}-${i}`}
              className={cn(
                'group relative overflow-hidden rounded-md border border-border bg-background',
                // Documents span the full row as a wide bar (showing the whole
                // file name); images stay as square thumbnails.
                image ? 'aspect-square' : 'col-span-full',
              )}
            >
              {image ? (
                <button
                  type="button"
                  onClick={() => preview.open(i)}
                  aria-label={`Preview ${file.name}`}
                  title={file.name}
                  className="size-full cursor-zoom-in"
                >
                  <ImageWithFallback
                    src={resolveMedia(file.url)}
                    alt={file.name}
                    wrapperClassName="size-full"
                    className="object-cover"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => preview.open(i)}
                  title={file.name}
                  className="flex size-full cursor-pointer items-center gap-3 p-3 text-left text-primary"
                >
                  <FileText className="size-6 shrink-0" />
                  <span className="min-w-0 flex-1 truncate pr-6 text-xs font-medium text-foreground">
                    {file.name}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${file.name}`}
                className="absolute right-1 top-1 z-10 flex size-5 cursor-pointer items-center justify-center rounded-md bg-background text-destructive shadow-sm transition hover:bg-destructive hover:text-white"
              >
                <X className="size-3" strokeWidth={3} />
              </button>
            </div>
          )
        })}

        {canAdd && (
          <FileUploader {...uploaderProps}>
            <div className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border text-center text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
              <Plus className="size-7" />
              <span className="text-xs font-medium leading-none">Add</span>
            </div>
          </FileUploader>
        )}
      </div>

      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}

      <ImageLightbox
        slides={preview.slides}
        index={preview.index}
        onIndexChange={preview.setIndex}
        onClose={preview.close}
      />
    </div>
  )
}
