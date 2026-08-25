import type { AuthUser } from '@/stores/auth-store'

export type { AuthUser }
export type { LoginValues, LoginResponse, TokenResponse } from '../schemas'

/** The client-side session a successful sign-in resolves to. */
export interface AuthSession {
  user: AuthUser
  token: string
  refreshToken: string
  /** Access-token lifetime in seconds. */
  expiresIn: number
}

/**
 * A login that stopped one step short, mapped from the API's two non-session
 * `200`s. `kind` says which code the user is being asked for, because the two
 * are spent on different endpoints and only one of them mints a token.
 */
export interface AuthChallenge {
  /**
   * `email` — the address was never verified; the code is spent on
   * `verify-email`, which issues nothing, so the login is replayed after.
   * `two-factor` — the user holds a second factor; the code is spent on
   * `verify-login-otp` together with `challengeToken`, which *is* the login.
   */
  kind: 'email' | 'two-factor'
  /** The half of a two-factor login the code is spent against. Empty for `email`. */
  challengeToken: string
  /** Partly hidden address the code went to — e.g. `xp****@gmail.com`. */
  maskedEmail: string
  /** How long the code lives from the moment it was mailed, in seconds. */
  otpExpiresIn: number
  /**
   * When that code actually lapses, as an absolute epoch-ms stamp taken the
   * moment the API answered. The countdown reads *this*, never `otpExpiresIn` —
   * a duration would restart from the top on every reload and every remount,
   * telling the user they have two fresh minutes on a code mailed long ago.
   */
  codeExpiresAt: number
  /** The API's own wording, shown verbatim above the code boxes. */
  message: string
}

/**
 * What a sign-in attempt resolved to. A login is not a two-outcome call: the
 * API answers `200` for "signed in", "verify your address first" and "send me
 * the second factor" alike, so only a rejection throws and the caller branches
 * on this instead of on an error.
 */
export type LoginOutcome =
  | { status: 'authenticated'; session: AuthSession }
  | { status: 'challenge'; challenge: AuthChallenge }

/**
 * The answer to a "confirm your password" check (`POST /user/me/verify-password`).
 *
 * A wrong password arrives here as `valid: false` rather than as a failure —
 * the question was asked and answered, so callers branch on `valid` instead of
 * on a thrown error.
 */
export interface PasswordCheck {
  /** Was that the signed-in user's password? */
  valid: boolean
  /** Guesses left in the current window (5 per 15 minutes; reset once correct). */
  attemptsRemaining: number
  /** The API's own wording, shown verbatim under the field. */
  message: string
}
