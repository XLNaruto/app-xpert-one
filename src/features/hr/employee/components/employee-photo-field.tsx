import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { mediaUrl } from '@/lib/media'
import { PHOTO_ACCEPT } from '../constants'

/**
 * The profile photo.
 *
 * The form holds the storage **key**, not the file: picking one uploads it
 * straight to storage on a presigned PUT and the key comes back, which is all the
 * employee record stores. So the field's value is already durable before step 1
 * is saved — an abandoned form just leaves a stray object behind.
 *
 * A freshly picked file is previewed from an object URL rather than the key,
 * because the stored object isn't readable through `mediaUrl()` until the record
 * references it. The URL is revoked when it's replaced or the field unmounts.
 */
export function EmployeePhotoField({
  value,
  onChange,
  onPick,
  isUploading,
  disabled = false,
}: {
  /** The stored object key, or `''` for no photo. */
  value: string
  onChange: (key: string) => void
  /** Uploads the file and answers its object key. */
  onPick: (file: File) => Promise<string>
  isUploading: boolean
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  // Revoke the object URL on replace/unmount so previews can't leak.
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    },
    [localPreview],
  )

  const pick = async (file: File | undefined) => {
    if (!file) return

    const preview = URL.createObjectURL(file)
    setLocalPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return preview
    })

    try {
      onChange(await onPick(file))
    } catch {
      // The caller toasts the failure; drop the preview so the field doesn't
      // show a photo that was never stored.
      setLocalPreview(null)
      URL.revokeObjectURL(preview)
    }
  }

  const clear = () => {
    setLocalPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return null
    })
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const src = localPreview ?? (value ? mediaUrl(value) : '')

  return (
    <div className="flex items-center gap-4">
      <ImageWithFallback
        src={src}
        alt="Employee photo"
        wrapperClassName="size-24 shrink-0 rounded-xl ring-1 ring-border"
        className="object-cover"
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            {value || localPreview ? 'Change Photo' : 'Upload Photo'}
          </Button>

          {(value || localPreview) && !disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">JPG, PNG or WebP.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="hidden"
        onChange={(event) => void pick(event.target.files?.[0])}
      />
    </div>
  )
}
