import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { ApiError, toApiError } from '@/lib/api-error'
import { IMAGE_CONTENT_TYPES, uploadFile } from '@/lib/uploads'
import { PROFILE_PHOTO_NOT_FOUND_MESSAGE } from '../constants'
import { myProfileResponseSchema, type UpdateMyProfileBody } from '../schemas'
import { toMyProfile } from '../lib/profile-mappers'
import type { MyProfile } from '../types'

const BAD_REQUEST_STATUS = 400

/**
 * GET /user/me — the signed-in account overview: the organization, the
 * subscription it is running (with the entitlements it was bought at), the
 * employee/company usage against those limits, and the company last picked in
 * the switcher. The user comes from the token, so there is no id to pass.
 */
export async function fetchMyProfile(): Promise<MyProfile> {
  try {
    const raw = await http.get<unknown>(endpoints.ME.GET)
    return toMyProfile(myProfileResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Load Your Profile.")
  }
}

/**
 * PATCH /user/me — edit the caller's own name, email (their login) and mobile.
 * Send only what changed. Answers the same body as `GET /user/me`, so the
 * caller repaints from it instead of reading again; the session stays signed in.
 */
export async function updateMyProfile(body: UpdateMyProfileBody): Promise<MyProfile> {
  try {
    const raw = await http.patch<unknown, UpdateMyProfileBody>(endpoints.ME.PATCH, body)
    return toMyProfile(myProfileResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Save Your Profile.")
  }
}

/**
 * PATCH /user/me/profile-photo — store a key from this user's own presign, or
 * `null` to remove the photo. Answers the `GET /user/me` body.
 *
 * A 400 for a key means it wasn't made by this user's presign; the server's
 * wording is replaced with one that tells them what to do about it.
 */
export async function setMyProfilePhoto(key: string | null): Promise<MyProfile> {
  try {
    const raw = await http.patch<unknown>(endpoints.ME.PROFILE_PHOTO, {
      profile_photo: key,
    })
    return toMyProfile(myProfileResponseSchema.parse(raw))
  } catch (error) {
    const apiError = toApiError(
      error,
      key ? "Couldn't Update Your Photo." : "Couldn't Remove Your Photo.",
    )
    if (key && apiError.status === BAD_REQUEST_STATUS) {
      throw new ApiError(PROFILE_PHOTO_NOT_FOUND_MESSAGE, apiError.status, apiError.code)
    }
    throw apiError
  }
}

/**
 * Replace the caller's photo: presign, PUT the bytes straight to storage, then
 * store the key. Nothing is saved until that last step, so a failure part-way
 * leaves the current photo as it was.
 */
export async function uploadMyProfilePhoto(file: File): Promise<MyProfile> {
  const key = await uploadFile(endpoints.ME.PROFILE_PHOTO_PRESIGN, file, IMAGE_CONTENT_TYPES)
  return setMyProfilePhoto(key)
}
