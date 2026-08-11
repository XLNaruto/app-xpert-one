import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { myRoleResponseSchema } from '../schemas'
import { toMyRole } from '../lib/permission-mappers'
import type { MyRole } from '../types'

/**
 * GET /user/my-role — the signed-in user's role, the flat `permission_codes`
 * every API route policy checks, and the same set as a menu tree.
 *
 * This is the single source of truth for menu / route / button visibility in
 * the app. It needs no permission of its own (the caller is asking about
 * themselves) and follows the token's login source, so a WEB session gets the
 * web panel's codes.
 */
export async function fetchMyRole(): Promise<MyRole> {
  try {
    const raw = await http.get<unknown>(endpoints.ME.MY_ROLE)
    return toMyRole(myRoleResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Failed to load your permissions.')
  }
}
