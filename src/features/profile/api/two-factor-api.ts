import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { ApiError, toApiError } from '@/lib/api-error'
import { twoFactorResponseSchema } from '../schemas'

/** The API's status for "the flag is already what you asked for". */
const CONFLICT_STATUS = 409

/**
 * Turn the caller's own second factor on or off —
 * `POST /user/me/two-factor/{enable,disable}`. The user comes from the token,
 * so there is no body and no id: a user can only ever flip their own. Neither
 * call needs a mailed code (the address was proved at the first login) and
 * neither signs the current session out.
 *
 * A 409 means the stored flag already *was* the requested one, which is not a
 * failure the user can act on — it's the truth about a state this client had
 * drifted from (nothing reports the flag, so it is only ever inferred). It
 * resolves to the requested value so the toggle corrects itself instead of
 * showing an error; every other failure throws.
 */
export async function setTwoFactorRequest(enabled: boolean): Promise<boolean> {
  try {
    const raw = await http.post<unknown>(
      enabled
        ? endpoints.ME.TWO_FACTOR_ENABLE
        : endpoints.ME.TWO_FACTOR_DISABLE,
    )
    return twoFactorResponseSchema.parse(raw).two_factor_auth
  } catch (error) {
    const apiError = toApiError(
      error,
      enabled
        ? "Couldn't turn two-factor authentication on."
        : "Couldn't turn two-factor authentication off.",
    )
    if (apiError instanceof ApiError && apiError.status === CONFLICT_STATUS) {
      return enabled
    }
    throw apiError
  }
}
