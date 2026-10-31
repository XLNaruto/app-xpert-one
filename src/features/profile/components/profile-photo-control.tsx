import { useRef } from 'react'
import { Camera, Loader2, Trash2, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { PROFILE_PHOTO_ACCEPT } from '../constants'
import { useProfilePhoto } from '../hooks/use-profile-photo'
import type { ProfileUser } from '../types'

/**
 * The signed-in user's avatar with its Change / Remove actions. The stored
 * `profilePhoto` is a storage key, resolved to a URL the same way an employee
 * photo or a company logo is; with none set the avatar falls back to initials.
 */
export function ProfilePhotoControl({ user }: { user: ProfileUser }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const photoUrl = useMediaUrl(user.profilePhoto)
  const { pickFile, isUploading, isRemoving, removeConfirm, requestRemove } = useProfilePhoto()
  const busy = isUploading || isRemoving

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <Avatar
          name={user.name}
          src={user.profilePhoto ? photoUrl : undefined}
          className="size-16 text-lg"
        />
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
            <Loader2 className="size-5 animate-spin text-primary" />
          </span>
        )}

        {/* Remove sits on the photo itself, like the employee photo's ✕. */}
        {user.profilePhoto && !busy && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={requestRemove}
                aria-label="Remove photo"
                className={cn(
                  'absolute -right-1 -top-1 grid size-6 cursor-pointer place-items-center rounded-full',
                  'border-2 border-background bg-destructive text-destructive-foreground shadow-sm transition-transform',
                  'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <X className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove Photo</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="space-y-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" />
          {user.profilePhoto ? 'Change Photo' : 'Upload Photo'}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        className="hidden"
        onChange={(event) => {
          void pickFile(event.target.files?.[0])
          // Let the same file be picked again after a failed upload.
          event.target.value = ''
        }}
      />

      <ConfirmDialog
        {...removeConfirm}
        variant="destructive"
        icon={Trash2}
        title="Remove Profile Photo?"
        description="Your Initials Will Be Shown Instead."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        loading={isRemoving}
        keepOpenOnConfirm
      />
    </div>
  )
}
