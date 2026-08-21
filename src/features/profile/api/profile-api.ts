import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { myProfileResponseSchema } from '../schemas'
import { toMyProfile } from '../lib/profile-mappers'
import type { MyProfile } from '../types'

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
    throw toApiError(error, "Couldn't load your profile.")
  }
}
