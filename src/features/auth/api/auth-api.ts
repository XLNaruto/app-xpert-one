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
 * POST /user/auth/login — exchange username + password for an access/refresh
 * pair plus the signed-in user. Signing in from a new device invalidates the
 * account's previous sessions, so any other tab will 401 and be signed out.
 */
export async function loginRequest({
  username,
  password,
}: Pick<LoginValues, 'username' | 'password'>): Promise<AuthSession> {
  try {
    const raw = await http.post<unknown, { username: string; password: string }>(
      endpoints.AUTH.LOGIN,
      { username, password },
    )
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
