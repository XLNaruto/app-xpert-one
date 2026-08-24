import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { toasterrormsg, toastsuccessmsg } from '@/lib/toast'
import { useAuthChallengeStore } from '@/stores/auth-challenge-store'
import {
  useLogin as useLoginMutation,
  useResendEmailOtp,
  useVerifyEmail,
  useVerifyLoginOtp,
} from '../api/use-auth'
import { otpSchema } from '../schemas'

const CODE_LENGTH = 6

/** Whole seconds until an absolute deadline, never negative. */
function secondsUntil(deadline: number) {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

/**
 * A replay of the login rejected outright — the code step is over either way,
 * so it is reported as a toast on the way back to the login screen rather than
 * under boxes the user can no longer do anything with.
 */
class LoginReplayError extends Error {
  /** What the login itself threw — the message worth showing. */
  readonly reason: unknown

  constructor(reason: unknown) {
    super('login replay failed')
    this.name = 'LoginReplayError'
    this.reason = reason
  }
}

/**
 * The code screen's controller. One hook covers both challenges because the
 * screen is identical and only the endpoints behind it differ:
 *
 * - **two-factor** — the code plus `challenge_token` *is* the login, so
 *   verifying it hands back a session or nothing; a spent challenge is a
 *   rejection, not a re-issue. A resend is asked for with that token and
 *   answers with a replacement, so the challenge is re-stamped rather than
 *   the login replayed.
 * - **email** — verifying the address mints nothing, so a success is followed
 *   by replaying the login. That second login is also what reveals a second
 *   factor on an account holding both, which arrives as a new challenge and
 *   keeps the user on this screen.
 *
 * Its input comes off `auth-challenge-store` rather than props, because the
 * step is its own route — see the store for why the credentials can't ride in
 * the URL. The route guard turns a missing challenge away, so a screen that
 * renders always has one.
 *
 * The code is short enough to keep in local state rather than react-hook-form —
 * there is one field and it submits itself once the last box is filled — but it
 * still goes through `otpSchema`, so the client-side rule lives in one place.
 */
export function useVerifyOtp() {
  const navigate = useNavigate()
  const challenge = useAuthChallengeStore((s) => s.challenge)
  const credentials = useAuthChallengeStore((s) => s.credentials)
  const replaceChallenge = useAuthChallengeStore((s) => s.replace)
  const clearChallenge = useAuthChallengeStore((s) => s.clear)

  /** The live code's absolute deadline — the one thing the countdown reads. */
  const codeExpiresAt = challenge?.codeExpiresAt ?? 0

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    secondsUntil(codeExpiresAt),
  )

  const verifyLoginOtp = useVerifyLoginOtp()
  const verifyEmail = useVerifyEmail()
  const resendEmailOtp = useResendEmailOtp()
  const login = useLoginMutation()

  const isTwoFactor = challenge?.kind === 'two-factor'

  /**
   * Whether the sign-in can be re-sent. The password is kept out of storage, so
   * after a reload it is gone, and the one convenience that needs a whole login
   * is lost — verifying an address can no longer sign the user straight in.
   * Entering a code and asking for a new one still work either way; those
   * endpoints identify the user themselves.
   */
  const canReplayLogin = Boolean(credentials?.password)

  /**
   * A new code means empty boxes — `codeExpiresAt` is what changes on every
   * one, whether it arrived from a re-issued challenge, a resend, or the
   * hand-off from an unverified address to a second factor.
   */
  useEffect(() => {
    setCode('')
    setError(null)
  }, [codeExpiresAt])

  /**
   * Tick the "expires in" line down to zero, then stop. Each tick is recomputed
   * from the deadline rather than decremented, so the figure stays honest
   * across a reload, a backgrounded tab and a sleeping machine — all of which
   * stall timers while the code keeps ageing.
   */
  useEffect(() => {
    setSecondsLeft(secondsUntil(codeExpiresAt))
    if (secondsUntil(codeExpiresAt) <= 0) return

    const timer = window.setInterval(() => {
      const left = secondsUntil(codeExpiresAt)
      setSecondsLeft(left)
      if (left <= 0) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [codeExpiresAt])

  const isPending =
    verifyLoginOtp.isPending || verifyEmail.isPending || login.isPending
  const isResending = resendEmailOtp.isPending || login.isPending

  /**
   * A new code is only offered once the current one has lapsed. Resending
   * *replaces* the live code, so an eager second press would invalidate the
   * one the user is halfway through typing. The countdown doubles as the wait.
   */
  const canResend = secondsLeft <= 0

  /** Drop the pending sign-in and go back to the credentials form. */
  const cancel = () => {
    clearChallenge()
    navigate({ to: '/login' })
  }

  /** Signed in — the step is spent, so it goes before the app takes over. */
  const finish = () => {
    clearChallenge()
    toast.success('Signed in')
    navigate({ to: '/dashboard' })
  }

  /**
   * Replay the sign-in and route whatever it answers with. A rejection here is
   * *not* a bad code — the credentials themselves were refused this time — so
   * it is tagged for the callers to handle apart from one, which they can't
   * tell from the message alone.
   */
  const replayLogin = async () => {
    if (!credentials?.password) return
    let outcome
    try {
      outcome = await login.mutateAsync(credentials)
    } catch (cause) {
      throw new LoginReplayError(cause)
    }
    if (outcome.status === 'authenticated') finish()
    else replaceChallenge(outcome.challenge)
  }

  /**
   * A spent code can't be re-entered, so a failed replay ends the step rather
   * than leaving the user staring at boxes that will only 401 from here on.
   */
  const abandon = (cause: unknown, fallback: string) => {
    toasterrormsg(getApiErrorMessage(cause, fallback))
    cancel()
  }

  const submit = async (value: string = code) => {
    if (!challenge || !credentials) return

    const parsed = otpSchema.safeParse({ otpCode: value })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code')
      return
    }
    setError(null)

    try {
      if (isTwoFactor) {
        // Either this mints the session or it throws — the challenge is
        // single-use and a stale one reads as expired, so there is no
        // re-issued challenge to fall through to.
        await verifyLoginOtp.mutateAsync({
          challengeToken: challenge.challengeToken,
          otpCode: parsed.data.otpCode,
          remember: credentials.remember,
        })
        finish()
        return
      }

      const message = await verifyEmail.mutateAsync({
        email: credentials.email,
        otpCode: parsed.data.otpCode,
      })
      toastsuccessmsg(message)
      // Verification issues no token, so the sign-in has to start over. With no
      // password to replay it with (a reload dropped it), the user finishes at
      // the login form — their address is verified, so it goes through now.
      if (!canReplayLogin) {
        cancel()
        return
      }
      await replayLogin()
    } catch (cause) {
      if (cause instanceof LoginReplayError) {
        // The address is verified now; it was the sign-in behind it that was
        // refused, and this code is spent either way.
        abandon(cause.reason, 'Your email is verified — please sign in again.')
        return
      }
      setCode('')
      setError(
        getApiErrorMessage(
          cause,
          'That code is wrong or has expired. Request a new one.',
        ),
      )
    }
  }

  /**
   * Mail a fresh code — `resend-email-otp`, for both branches, asked for by
   * whichever handle identifies the pending step: the address on the
   * unverified-email branch, the `challenge_token` from the login on the
   * two-factor one. Either way it replaces the live code.
   *
   * The two-factor branch gets a re-issued `challenge_token` back, since the
   * old one dies with the code it was minted beside — so the challenge is
   * re-stamped with it here, and `verify-login-otp` spends the new one. A
   * resend therefore no longer needs the password replayed, and works after a
   * reload has dropped it.
   */
  const resend = async () => {
    // Held shut until the live code lapses — see `canResend`.
    if (!challenge || !credentials || !canResend) return
    setError(null)

    try {
      const result = await resendEmailOtp.mutateAsync(
        isTwoFactor
          ? { challengeToken: challenge.challengeToken }
          : { email: credentials.email },
      )
      toastsuccessmsg(result.message)
      // The new code carries its own deadline; putting it on the challenge is
      // what restarts the countdown and clears the boxes (see the effect
      // above). A server that re-issued no token leaves the current one in
      // place rather than blanking it.
      replaceChallenge({
        ...challenge,
        challengeToken: result.challengeToken || challenge.challengeToken,
        otpExpiresIn: result.otpExpiresIn,
        codeExpiresAt: result.codeExpiresAt,
      })
    } catch (cause) {
      // Only `resend-email-otp` can fail here now, and it always answers 200 in
      // practice — so this is a transport failure, and the step survives it.
      setError(
        getApiErrorMessage(cause, "Couldn't send a new code. Please try again."),
      )
    }
  }

  return {
    challenge,
    /** The address the code went to, for the "sent to …" line. */
    maskedEmail: challenge?.maskedEmail ?? '',
    code,
    setCode,
    codeLength: CODE_LENGTH,
    error,
    /** Seconds until the mailed code lapses; 0 once it has. */
    secondsLeft,
    /**
     * How much of the code's life is left, `1` → `0`. The countdown ring reads
     * this; it's derived from the code's own TTL rather than a fixed span, so a
     * server that changes how long codes live doesn't desync the dial from the
     * figure beside it.
     */
    progress:
      challenge && challenge.otpExpiresIn > 0
        ? Math.min(1, secondsLeft / challenge.otpExpiresIn)
        : 0,
    isTwoFactor,
    isPending,
    isResending,
    /** False while a live code is still running its clock. */
    canResend,
    submit,
    resend,
    cancel,
  }
}
