import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import { loginResponseSchema } from '../schemas'
import { toAuthUser } from '../lib/auth-mappers'
import type { LoginValues } from '../schemas'
import type { AuthSession } from '../types'

/**
 * Backend session endpoints. Token *rotation* on a 401 lives in the api-client
 * interceptor and `lib/auth-refresh.ts` (which must use a bare axios client to
 * avoid recursing through that interceptor).
 */

/**
 * POST /user/auth/login — exchange email + password for an access/refresh pair
 * plus the signed-in user. `email` is unique platform-wide, so an account owner
 * and a tenant-created admin sign in through the same form (there is no
 * `is_owner` flag or company code to disambiguate).
 *
 * `source: 'WEB'` is what makes this a browser session: the API keeps exactly
 * one, so signing in again elsewhere on the web signs the previous browser out
 * — while the same user's `APP` sessions on their phones are left alone. It
 * also decides the permission the login is checked against (`web:access`), so a
 * user without panel access gets a 403 rather than a 401.
 */
export async function loginRequest({
  email,
  password,
}: Pick<LoginValues, 'email' | 'password'>): Promise<AuthSession> {
  try {
    const raw = await http.post<
      unknown,
      { email: string; password: string; source: 'WEB' }
    >(endpoints.AUTH.LOGIN, { email, password, source: 'WEB' })
    const data = loginResponseSchema.parse(raw)
    return {
      user: toAuthUser(data.user),
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Sign-in failed. Please check your credentials.'),
    )
  }
}

/**
 * POST /user/auth/logout — revoke the session server-side. Authorised by the
 * access token (no body), so it's a no-op once we're already signed out.
 */
export async function logoutRequest(): Promise<void> {
  await http.post<void>(endpoints.AUTH.LOGOUT)
}
