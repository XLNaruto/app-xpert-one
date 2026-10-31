import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/stores/auth-store'
import { setMyProfilePhoto, updateMyProfile, uploadMyProfilePhoto } from './profile-api'
import type { UpdateMyProfileBody } from '../schemas'
import type { MyProfile } from '../types'

/**
 * Every `/user/me` write answers the full `GET /user/me` body, so the cache is
 * written from it rather than refetched. The session's own copy of the name and
 * email (shown by the two-factor card and the topbar fallback) follows along.
 */
function useApplyMyProfile() {
  const queryClient = useQueryClient()
  const patchUser = useAuthStore((s) => s.patchUser)

  return (profile: MyProfile) => {
    queryClient.setQueryData(queryKeys.profile.me(), profile)
    patchUser({ name: profile.user.name, email: profile.user.email })
  }
}

/** PATCH /user/me — the caller's own name, email and mobile. */
export function useUpdateMyProfile() {
  const apply = useApplyMyProfile()
  return useMutation({
    mutationFn: (body: UpdateMyProfileBody) => updateMyProfile(body),
    onSuccess: apply,
  })
}

/** Presign + PUT + PATCH — replace the caller's own photo. */
export function useUploadMyProfilePhoto() {
  const apply = useApplyMyProfile()
  return useMutation({
    mutationFn: (file: File) => uploadMyProfilePhoto(file),
    onSuccess: apply,
  })
}

/** PATCH /user/me/profile-photo with `null` — back to the initials. */
export function useRemoveMyProfilePhoto() {
  const apply = useApplyMyProfile()
  return useMutation({
    mutationFn: () => setMyProfilePhoto(null),
    onSuccess: apply,
  })
}
