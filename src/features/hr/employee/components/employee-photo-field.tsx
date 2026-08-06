import { useEffect, useMemo, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { PHOTO_ACCEPT } from '../constants'

/**
 * The profile photo.
 *
 * **Picking a file uploads nothing.** The chosen `File` is held by the form hook
 * and only presigned + PUT when Save is pressed, so an abandoned form leaves no
 * stray object in storage and a user who changes their mind costs no upload. The
 * form's `photo` value stays the *stored* key until that save succeeds.
 *
 * A pending file is previewed from an object URL rather than a key, since it has
 * no storage location yet. The URL is revoked when the file changes or the field
 * unmounts.
 *
 * The box itself is the picker — there's no separate "Change Photo" button — and
 * clearing is the ✕ pinned to its top-right corner, which only appears once
 * there's a photo to clear.
 *
 * On edit the key comes back from the API as a bare storage path
 * (`accounts/1/employees/photos/6a74….png`); `useMediaUrl()` prefixes it with the
 * CDN origin from `GET /config`.
 */
export function EmployeePhotoField({
  value,
  onChange,
  pendingFile,
  onPickFile,
  isUploading,
  disabled = false,
}: {
  /** The stored object key, or `''` for no photo. */
  value: string
  onChange: (key: string) => void
  /** The picked-but-not-yet-uploaded file, or `null`. */
  pendingFile: File | null
  /** Hold a picked file for the save to upload; `null` clears it. */
  onPickFile: (file: File | null) => void
  /** True while the deferred upload runs as part of a save. */
  isUploading: boolean
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Resolved against the config store's media base URL, subscribed — an edit
  // opened before the config lands still shows the photo once it arrives.
  const storedUrl = useMediaUrl(value)

  // One object URL per pending file, revoked when it's replaced or the field
  // unmounts so previews can't leak.
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  )
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const clear = () => {
    onPickFile(null)
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const src = previewUrl ?? storedUrl
  const hasPhoto = Boolean(pendingFile || value)

  return (
    <div className="w-fit space-y-1.5">
      <div className="relative size-24">
        {/* The box IS the picker — no separate button. */}
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          aria-label={hasPhoto ? 'Change photo' : 'Upload photo'}
          className={cn(
            'size-full overflow-hidden rounded-xl border border-dashed border-input transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            disabled || isUploading
              ? 'cursor-not-allowed opacity-70'
              : 'cursor-pointer hover:border-primary/50 hover:bg-primary/5',
          )}
        >
          {hasPhoto ? (
            <ImageWithFallback
              src={src}
              alt="Employee photo"
              wrapperClassName="size-full bg-transparent"
              className="object-cover"
            />
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-1 bg-muted/40 text-muted-foreground">
              <Camera className="size-6" />
              <span className="text-[11px] font-medium leading-none">Add photo</span>
            </span>
          )}

          {/* The deferred upload runs on Save, so the box reports it. */}
          {isUploading && (
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-background/70">
              <Loader2 className="size-5 animate-spin text-primary" />
            </span>
          )}
        </button>

        {hasPhoto && !disabled && !isUploading && (
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            title="Remove photo"
            className={cn(
              // Sits inside the box, matching the remove control on the shared
              // file dropzones.
              'absolute right-1 top-1 z-10 grid size-6 cursor-pointer place-items-center rounded-md',
              'bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors',
              'hover:bg-destructive/10 hover:text-destructive',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">JPG, PNG or WebP.</p>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="hidden"
        // A cancelled picker fires with no file — leave the pending one alone.
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onPickFile(file)
        }}
      />
    </div>
  )
}
