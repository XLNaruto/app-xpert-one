import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  loginOutcomeResponseSchema,
  loginResponseSchema,
  resendEmailOtpResponseSchema,
  verifyEmailResponseSchema,
} from '../schemas'
import { toAuthUser } from '../lib/auth-mappers'
import type { LoginResponse, LoginValues } from '../schemas'
import type { AuthSession, LoginOutcome } from '../types'

/** A freshly mailed verification code: its wording and when it lapses. */
export interface ResendResult {
  message: string
  otpExpiresIn: number
  /** Absolute epoch-ms deadline — see `AuthChallenge.codeExpiresAt`. */
  codeExpiresAt: number
  /**
   * The re-issued two-factor challenge, when the resend was asked for with one.
   * Empty on the unverified-address branch, which has no challenge.
   */
  challengeToken: string
}

/**
 * Who a resend is for. The API identifies the recipient either way: an
 * unverified address by the address itself, a two-factor login by the
 * `challenge_token` its login answered with.
 */
export type ResendTarget =
  | { email: string; challengeToken?: undefined }
  | { challengeToken: string; email?: undefined }

/**
 * Backend session endpoints. Token *rotation* on a 401 lives in the api-client
 * interceptor and `lib/auth-refresh.ts` (which must use a bare axios client to
 * avoid recursing through that interceptor).
 */

/** What the API mints codes for, when a response doesn't say. */
const DEFAULT_OTP_TTL_SECONDS = 120

/** Fallback wording when the API sends a challenge without a `message`. */
function challengeMessage(maskedEmail: string) {
  return `We have sent a verification code to ${maskedEmail}.`
}

/** The session half of a `200`, once it's known to be the authenticated one. */
function toAuthSession(data: LoginResponse): AuthSession {
  return {
    user: toAuthUser(data.user),
    token: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

/** Turn any of the login endpoint's three `200` bodies into a `LoginOutcome`. */
function toLoginOutcome(raw: unknown, email: string): LoginOutcome {
  const data = loginOutcomeResponseSchema.parse(raw)

  if ('access_token' in data) {
    return { status: 'authenticated', session: toAuthSession(data) }
  }

  const maskedEmail = data.masked_email ?? email
  // Two minutes is what the API mints codes for; only used if it stops saying
  // so, and the countdown is cosmetic either way.
  const otpExpiresIn = data.otp_expires_in ?? DEFAULT_OTP_TTL_SECONDS
  return {
    status: 'challenge',
    challenge: {
      kind:
        data.status === 'two_factor_required' ? 'two-factor' : 'email',
      challengeToken:
        data.status === 'two_factor_required' ? data.challenge_token : '',
      maskedEmail,
      otpExpiresIn,
      // Stamped here, where the answer just arrived, so the deadline survives
      // the reloads and remounts a duration wouldn't.
      codeExpiresAt: Date.now() + otpExpiresIn * 1000,
      message: data.message ?? challengeMessage(maskedEmail),
    },
  }
}

/**
 * POST /user/auth/login — exchange email + password for an access/refresh pair
 * plus the signed-in user, *or* for the next step of the sign-in.
 *
 * The API takes two login forms, picked by the required `is_owner` flag: `true`
 * is the account owner (email + password alone), `false` is an admin user the
 * tenant created and additionally requires `company_code` — the code of the
 * company that user belongs to. There is no fallback between the two, so an
 * address sent through the wrong form answers 401 with the same message as a
 * wrong password. The sign-in screen picks the form with an Owner/User tab,
 * which is what `isOwner` carries here.
 *
 * `source: 'WEB'` is what makes this a browser session: the API keeps exactly
 * one, so signing in again elsewhere on the web signs the previous browser out
 * — while the same user's `APP` sessions on their phones are left alone. It
 * also decides the permission the login is checked against (`web:access`), so a
 * user without panel access gets a 403 rather than a 401.
 *
 * Correct credentials do not guarantee a session: an unverified address and a
 * user holding a second factor each answer `200` with a challenge instead, so
 * the result is a `LoginOutcome` and only a *rejected* login throws.
 */
export async function loginRequest({
  email,
  password,
  isOwner,
  companyCode,
  remember,
}: LoginValues): Promise<LoginOutcome> {
  const code = companyCode.trim()
  try {
    const raw = await http.post<
      unknown,
      {
        email: string
        password: string
        is_owner: boolean
        company_code?: string
        source: 'WEB'
        remember_me: boolean
      }
    >(endpoints.AUTH.LOGIN, {
      email,
      password,
      // `company_code` is ignored by the API on the owner form, so it's only
      // sent alongside `is_owner: false`.
      is_owner: isOwner,
      ...(isOwner ? {} : { company_code: code }),
      source: 'WEB',
      // The tick-box is a *server-side* refresh lifetime (30 days vs 12 hours),
      // so it has to be sent — storing the token differently can't extend it.
      remember_me: remember,
    })
    return toLoginOutcome(raw, email)
  } catch (error) {
    throw toApiError(error, 'Sign-in failed. Please check your credentials.')
  }
}

/**
 * POST /user/auth/verify-email — spend the code a first login mailed, which
 * flips `is_email_verified` on the user.
 *
 * It takes the address rather than a handle, so the user can finish from the
 * mail on a device that never saw the login response. No token comes back —
 * verification is not a login — so the caller signs in again afterwards, which
 * is also what surfaces a second factor on an account holding both.
 *
 * The code is single-use and lives two minutes, and three wrong guesses burn
 * it; wrong, expired and too-many-attempts all answer 400 alike. A 400 (rather
 * than a 401) is what keeps a rejected code from reaching the api-client's
 * 401 branch, which would sign the user out mid-verification — see the note on
 * `verifyEmailRequest`'s caller in `use-verify-otp.ts`.
 */
export async function verifyEmailRequest(
  email: string,
  otpCode: string,
): Promise<string> {
  try {
    const raw = await http.post<unknown, { email: string; otp_code: string }>(
      endpoints.AUTH.VERIFY_EMAIL,
      { email, otp_code: otpCode },
    )
    const data = verifyEmailResponseSchema.parse(raw)
    return data.message ?? 'Email verified.'
  } catch (error) {
    throw toApiError(
      error,
      'That code is wrong or has expired. Request a new one.',
    )
  }
}

/**
 * POST /user/auth/resend-email-otp — mail a fresh verification code, which
 * replaces any live one, and serves both challenges.
 *
 * Which one is decided by what's sent: the unverified-address step sends the
 * `email`, and a two-factor login sends the `challenge_token` its login
 * answered with instead — the token is what identifies the pending sign-in, so
 * the address is neither needed nor accepted as a stand-in there. That branch
 * gets a *new* `challenge_token` back, which supersedes the one it was asked
 * with: the old one dies with the code it was minted beside, so
 * `verify-login-otp` must be given the returned token from here on.
 *
 * On the address branch it always answers `200` with the same shape: an unknown
 * address, a deactivated user and an already-verified one are indistinguishable
 * from a code being sent, so this can't double as an account-exists lookup.
 */
export async function resendEmailOtpRequest(
  target: ResendTarget,
): Promise<ResendResult> {
  try {
    const raw = await http.post<
      unknown,
      { email?: string; challenge_token?: string }
    >(
      endpoints.AUTH.RESEND_EMAIL_OTP,
      target.challengeToken
        ? { challenge_token: target.challengeToken }
        : { email: target.email },
    )
    const data = resendEmailOtpResponseSchema.parse(raw)
    const otpExpiresIn = data.otp_expires_in ?? DEFAULT_OTP_TTL_SECONDS
    return {
      message:
        data.message ??
        challengeMessage(data.masked_email ?? 'your email address'),
      otpExpiresIn,
      // The old code is dead the moment this one is mailed, so the countdown
      // restarts from this answer rather than from the original challenge.
      codeExpiresAt: Date.now() + otpExpiresIn * 1000,
      // A server that re-issues nothing leaves the caller on the token it
      // already holds, so an absent field must not read as "cleared".
      challengeToken: data.challenge_token ?? '',
    }
  } catch (error) {
    throw toApiError(error, "Couldn't send a new code. Please try again.")
  }
}

/**
 * POST /user/auth/verify-login-otp — the second half of a login that answered
 * `two_factor_required`, and the only place a token is minted for one.
 *
 * Which user is signed in, and from which client, comes out of the challenge
 * rather than this request, so the session shape (a `WEB` login signs the
 * previous browser out, an `APP` login does not) can't be changed between the
 * two steps. The role and the `web:access` right are re-read here, so a login
 * refused in the meantime does not complete.
 *
 * Unlike the login, this resolves to a session or not at all: the success body
 * is *exactly* the `authenticated` one. The challenge is single-use and expires
 * with the code, and a replay reads as expired — so a spent or stale challenge
 * is a rejection, never a re-issued one. That is why nothing here can hand back
 * another challenge, and why the caller has no branch for one.
 */
export async function verifyLoginOtpRequest(
  challengeToken: string,
  otpCode: string,
): Promise<AuthSession> {
  try {
    const raw = await http.post<
      unknown,
      { challenge_token: string; otp_code: string }
    >(endpoints.AUTH.VERIFY_LOGIN_OTP, {
      challenge_token: challengeToken,
      otp_code: otpCode,
    })
    return toAuthSession(loginResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(
      error,
      'That code is wrong or has expired. Request a new one.',
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
