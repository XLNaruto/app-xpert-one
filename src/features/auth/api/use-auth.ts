import { useMutation } from '@tanstack/react-query'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { mockDelay } from '@/lib/utils'
import type { LoginValues } from '../schemas'

/**
 * Sign-in mutation. There is no auth backend yet, so this is a local mock:
 * any valid-format email + password succeeds and establishes a client session.
 * When the real API lands, swap the `mutationFn` for the `POST /auth/login`
 * call and hydrate the store from its response — nothing else here changes.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation<AuthUser, Error, LoginValues>({
    mutationFn: async ({ email }) => {
      await mockDelay(undefined, 600)
      const name = email.split('@')[0] || 'User'
      return {
        id: 'mock-user',
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
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

/**
 * Forgot-password step 1 — request an OTP for the given email. Mock: always
 * "succeeds". Swap for `POST /auth/forgot-password` when the API lands.
 */
export function useSendOtp() {
  return useMutation<void, Error, { email: string }>({
    mutationFn: async () => {
      await mockDelay(undefined, 600)
    },
  })
}

/**
 * Forgot-password step 2 — verify the 6-digit OTP. Mock: any 6-digit code
 * passes. Swap for `POST /auth/verify-otp` later.
 */
export function useVerifyOtp() {
  return useMutation<void, Error, { email: string; otp: string }>({
    mutationFn: async () => {
      await mockDelay(undefined, 600)
    },
  })
}

/**
 * Forgot-password step 3 — set a new password. Mock only. Swap for
 * `POST /auth/reset-password` later.
 */
export function useResetPassword() {
  return useMutation<void, Error, { email: string; password: string }>({
    mutationFn: async () => {
      await mockDelay(undefined, 600)
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
