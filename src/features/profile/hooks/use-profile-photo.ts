import { useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { checkFileContent } from '@/lib/file-signature'
import { IMAGE_CONTENT_TYPES } from '@/lib/uploads'
import {
  useRemoveMyProfilePhoto,
  useUploadMyProfilePhoto,
} from '../api/use-profile-mutations'

/**
 * Change / remove the signed-in user's own photo. Unlike the employee photo
 * there's no surrounding form to save with, so a picked file uploads straight
 * away (presign → PUT → PATCH); removing asks first, since it can't be undone
 * without the original file.
 */
export function useProfilePhoto() {
  const uploadPhoto = useUploadMyProfilePhoto()
  const removePhoto = useRemoveMyProfilePhoto()
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      toast.error('Photo Must Be a JPG, PNG or WebP Image.')
      return
    }
    // `file.type` comes from the name, so a renamed file gets past the line
    // above. The bytes decide.
    const mismatch = await checkFileContent(file, IMAGE_CONTENT_TYPES)
    if (mismatch) {
      toast.error(mismatch)
      return
    }
    uploadPhoto.mutate(file, {
      onSuccess: () => toast.success('Profile Photo Updated'),
      onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't Update Your Photo.")),
    })
  }

  const confirmRemove = () => {
    removePhoto.mutate(undefined, {
      onSuccess: () => {
        toast.success('Profile Photo Removed')
        setRemoveConfirmOpen(false)
      },
      onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't Remove Your Photo.")),
    })
  }

  return {
    pickFile,
    isUploading: uploadPhoto.isPending,
    isRemoving: removePhoto.isPending,
    removeConfirm: {
      open: removeConfirmOpen,
      onOpenChange: setRemoveConfirmOpen,
      onConfirm: confirmRemove,
    },
    requestRemove: () => setRemoveConfirmOpen(true),
  }
}
