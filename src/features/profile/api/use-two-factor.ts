import { useMutation } from '@tanstack/react-query'
import { toastApiError } from '@/lib/api-toast'
import { toastsuccessmsg } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth-store'
import { setTwoFactorRequest } from './two-factor-api'

/**
 * Turn the signed-in user's second factor on or off. There is no query to pair
 * this with — no endpoint reports the flag — so the truth lives on the auth
 * store (`twoFactorEnabled`), seeded at sign-in by which body the login
 * answered with and moved from here.
 *
 * Nothing else in the app reads a cached copy, so there is no invalidation to
 * do: the change only takes effect at the *next* login, and this session stays
 * signed in either way.
 */
export function useSetTwoFactor() {
  const setTwoFactorEnabled = useAuthStore((s) => s.setTwoFactorEnabled)

  return useMutation<boolean, Error, boolean>({
    mutationFn: (enabled) => setTwoFactorRequest(enabled),
    onSuccess: (enabled) => {
      setTwoFactorEnabled(enabled)
      toastsuccessmsg(
        enabled
          ? 'Two-factor authentication is on. You’ll be asked for a code at your next sign-in.'
          : 'Two-factor authentication is off.',
        4000,
      )
    },
    onError: (error) =>
      toastApiError(error, "Couldn't change two-factor authentication."),
  })
}
