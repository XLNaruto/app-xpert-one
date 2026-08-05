import { useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useCompanyStore } from '@/stores/company-store'
import { loginRequest, logoutRequest } from './auth-api'
import type { LoginValues } from '../schemas'
import type { AuthSession } from '../types'

/** Demo session for `VITE_USE_MOCK_API=true` (no backend reachable). */
async function mockLogin({ username }: LoginValues): Promise<AuthSession> {
  await mockDelay(undefined, 600)
  return {
    user: {
      id: 0,
      accountId: 0,
      email: `${username}@example.com`,
      username,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      roleId: null,
      companyId: null,
      isOwner: true,
      // Mirrors an owner who last worked in the second demo tenant — the gate
      // still asks, with that one pre-highlighted.
      lastSelectedCompanyId: 2,
    },
    token: 'mock-access-token',
    // An empty refresh token keeps the refresh scheduler and the 401 retry
    // path idle (see lib/auth-refresh.ts).
    refreshToken: '',
    expiresIn: 0,
  }
}

/**
 * Sign-in mutation — `POST /user/auth/login`. On success the returned token
 * pair and user hydrate the auth store; `expiresIn` is what the background
 * scheduler in `lib/auth-refresh.ts` uses to renew the access token before it
 * lapses. `remember` decides whether the session survives a browser restart.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  const clearCompany = useCompanyStore((s) => s.clear)

  return useMutation<AuthSession, Error, LoginValues>({
    mutationFn: (values) =>
      env.VITE_USE_MOCK_API ? mockLogin(values) : loginRequest(values),
    onSuccess: (session, { remember }) => {
      setSession(session.user, session.token, session.refreshToken, {
        remember,
        expiresIn: session.expiresIn,
      })
      // Drop any previous user's mirrored tenant — `user.company_id` from this
      // login is now the active company, and `/user/my/companies` repopulates
      // the mirror right after.
      clearCompany()
    },
  })
}

/**
 * Sign out — `POST /user/auth/logout` revokes the session server-side, then the
 * local session is cleared regardless of whether that call succeeded (an
 * already-expired token must not trap the user in the app).
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const logout = useAuthStore((s) => s.logout)
  const clearCompany = useCompanyStore((s) => s.clear)

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (env.VITE_USE_MOCK_API) {
        await mockDelay(undefined, 150)
        return
      }
      await logoutRequest()
    },
    onSettled: () => {
      logout()
      // Drop the mirrored tenant so the next user doesn't inherit it.
      clearCompany()
      // And drop every cached response — it belonged to the previous session.
      queryClient.clear()
    },
  })
}
