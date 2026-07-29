import { useMutation } from '@tanstack/react-query'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { mockDelay } from '@/lib/utils'
import type { LoginValues } from '../schemas'

/**
 * Sign-in mutation. There is no auth backend yet, so this is a local mock:
 * any username + password succeeds and establishes a client session.
 * When the real API lands, swap the `mutationFn` for the `POST /auth/login`
 * call and hydrate the store from its response — nothing else here changes.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation<AuthUser, Error, LoginValues>({
    mutationFn: async ({ username }) => {
      await mockDelay(undefined, 600)
      return {
        id: 'mock-user',
        name: username.charAt(0).toUpperCase() + username.slice(1),
        username,
        role: 'admin',
      }
    },
    onSuccess: (user, { remember }) => {
      // Placeholder tokens until the API exists. An empty refresh token keeps
      // the background refresh scheduler idle (see lib/auth-refresh.ts).
      setSession(user, 'mock-access-token', '', { remember })
    },
  })
}

/** Sign out — clears the local session. (Backend revoke added with the API.) */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout)

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await mockDelay(undefined, 150)
    },
    onSettled: () => logout(),
  })
}
