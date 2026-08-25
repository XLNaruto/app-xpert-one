import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { verifyPasswordResponseSchema } from '../schemas'
import type { PasswordCheck } from '../types'

/**
 * POST /user/me/verify-password — confirm the signed-in user's own password
 * before a sensitive action.
 *
 * Which user is checked comes out of the token: there is no `email` and no
 * `user_id` in the body, by design (an endpoint that could name a user would be
 * a password oracle). The call changes nothing — no token is issued or rotated
 * and no session is signed out — so it is safe to call before opening a
 * sensitive screen and safe to call again.
 *
 * A WRONG password is a `200` with `valid: false`, not a 401, which is the whole
 * reason this resolves instead of throwing: a 401 here would be read as a dead
 * session and sign the user out mid-dialog. Callers branch on `valid`.
 *
 * Guesses are counted per user — five per fifteen minutes, reset the moment the
 * password is right — and running out answers 429 with the wait in its message.
 * That one *does* throw (as an `ApiError` carrying the status), so the dialog can
 * lock its field; `attemptsRemaining` is shown under the field to keep the user
 * from walking into it.
 */
export async function verifyPasswordRequest(password: string): Promise<PasswordCheck> {
  try {
    const raw = await http.post<unknown>(endpoints.ME.VERIFY_PASSWORD, { password })
    const data = verifyPasswordResponseSchema.parse(raw)
    return {
      valid: data.valid,
      attemptsRemaining: data.attempts_remaining,
      message: data.message,
    }
  } catch (error) {
    throw toApiError(error, "Couldn't confirm your password. Please try again.")
  }
}
