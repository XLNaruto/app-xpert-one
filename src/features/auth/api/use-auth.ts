import { useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useCompanyStore } from '@/stores/company-store'
import {
  loginRequest,
  logoutRequest,
  resendEmailOtpRequest,
  verifyEmailRequest,
  verifyLoginOtpRequest,
} from './auth-api'
import type { ResendResult, ResendTarget } from './auth-api'
import type { LoginValues } from '../schemas'
import type { AuthSession, LoginOutcome } from '../types'

/** Demo session for `VITE_USE_MOCK_API=true` (no backend reachable). */
async function mockLogin({
  email,
  isOwner,
}: LoginValues): Promise<LoginOutcome> {
  await mockDelay(undefined, 600)
  const handle = email.split('@')[0]
  // Mirrors the API's two forms: the User tab means a tenant-created admin, who
  // is already bound to that company, so the gate never asks.
  return {
    status: 'authenticated',
    session: {
      user: {
        id: 0,
        accountId: 0,
        email,
        name: handle.charAt(0).toUpperCase() + handle.slice(1),
        roleId: null,
        companyId: isOwner ? null : 1,
        isOwner,
        // Mirrors an owner who last worked in the second demo tenant — the gate
        // still asks, with that one pre-highlighted.
        lastSelectedCompanyId: 2,
      },
      token: 'mock-access-token',
      // An empty refresh token keeps the refresh scheduler and the 401 retry
      // path idle (see lib/auth-refresh.ts).
      refreshToken: '',
      expiresIn: 0,
    },
  }
}

/**
 * Hydrate the store from a completed sign-in. Shared by the password login and
 * the two-factor step, which mint the same session — `viaTwoFactor` is the only
 * evidence the app ever gets that the user holds a second factor, since no
 * endpoint reports the flag.
 */
function useEstablishSession() {
  const setSession = useAuthStore((s) => s.setSession)
  const clearCompany = useCompanyStore((s) => s.clear)

  return (session: AuthSession, remember: boolean, viaTwoFactor: boolean) => {
    setSession(session.user, session.token, session.refreshToken, {
      remember,
      expiresIn: session.expiresIn,
      twoFactorEnabled: viaTwoFactor,
    })
    // Drop any previous user's mirrored tenant — `user.company_id` from this
    // login is now the active company, and `/user/my/companies` repopulates
    // the mirror right after.
    clearCompany()
  }
}

/**
 * Sign-in mutation — `POST /user/auth/login`. Resolves to a `LoginOutcome`,
 * because right credentials don't always mean a session: an unverified address
 * and a second factor each answer with a challenge instead, and only the
 * `authenticated` outcome hydrates the store here.
 *
 * On that outcome the token pair and user land in the auth store; `expiresIn`
 * is what the background scheduler in `lib/auth-refresh.ts` uses to renew the
 * access token before it lapses. `remember` decides both the server-side
 * refresh lifetime and whether the session survives a browser restart.
 */
export function useLogin() {
  const establish = useEstablishSession()

  return useMutation<LoginOutcome, Error, LoginValues>({
    mutationFn: (values) =>
      env.VITE_USE_MOCK_API ? mockLogin(values) : loginRequest(values),
    onSuccess: (outcome, { remember }) => {
      if (outcome.status === 'authenticated') {
        establish(outcome.session, remember, false)
      }
    },
  })
}

/**
 * Finish a two-factor login — `POST /user/auth/verify-login-otp`. The challenge
 * carries which user is signing in, so the code is all this adds.
 *
 * It either mints the session or fails: the success body is exactly the
 * `authenticated` login body, and a spent or expired challenge is a rejection
 * rather than a re-issued one. Reaching a session this way is also the only
 * evidence the app gets that the user holds a second factor — hence
 * `viaTwoFactor: true`.
 */
export function useVerifyLoginOtp() {
  const establish = useEstablishSession()

  return useMutation<
    AuthSession,
    Error,
    { challengeToken: string; otpCode: string; remember: boolean }
  >({
    mutationFn: ({ challengeToken, otpCode }) =>
      verifyLoginOtpRequest(challengeToken, otpCode),
    onSuccess: (session, { remember }) => establish(session, remember, true),
  })
}

/**
 * Prove an address — `POST /user/auth/verify-email`. It mints no token, so
 * there is no session to establish here: the caller replays the login once this
 * resolves. Returns the API's own confirmation wording.
 */
export function useVerifyEmail() {
  return useMutation<string, Error, { email: string; otpCode: string }>({
    mutationFn: ({ email, otpCode }) => verifyEmailRequest(email, otpCode),
  })
}

/**
 * Mail a fresh verification code — `POST /user/auth/resend-email-otp`. Serves
 * both challenges: the unverified-address step asks by `email`, a two-factor
 * login asks by `challengeToken` and gets a re-issued one back, which the
 * caller must put on the challenge before verifying again.
 */
export function useResendEmailOtp() {
  return useMutation<ResendResult, Error, ResendTarget>({
    mutationFn: (target) => resendEmailOtpRequest(target),
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
