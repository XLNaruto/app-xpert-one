import { createFileRoute, redirect } from '@tanstack/react-router'
import { VerifyOtpPage } from '@/features/auth'
import { useAuthChallengeStore } from '@/stores/auth-challenge-store'

/**
 * The code step of a sign-in. It is only reachable *from* a login that answered
 * with a challenge — the pending sign-in lives in memory (it carries the
 * password, so it can't ride in the URL or be persisted), and without one there
 * is nothing to verify. A typed URL or a reload therefore goes back to /login.
 */
export const Route = createFileRoute('/_auth/verify-otp')({
  beforeLoad: () => {
    if (!useAuthChallengeStore.getState().challenge) {
      throw redirect({ to: '/login' })
    }
  },
  component: VerifyOtpPage,
})
