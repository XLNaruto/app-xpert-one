import { z } from 'zod'

/** Email + password sign-in (mirrors the login request body). */
export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .max(255)
      .email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
    /**
     * Which of the API's two login forms this is, sent as `is_owner`. The
     * account owner signs in with email + password alone; an admin user the
     * tenant created must also send the code of the company they belong to.
     * The sign-in screen picks it with a tab.
     */
    isOwner: z.boolean(),
    /** The company's code, as shown on the company screen. Users only. */
    companyCode: z
      .string()
      .trim()
      .max(50, 'Company code must be 50 characters or less'),
    remember: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.isOwner && v.companyCode === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyCode'],
        message: 'Company code is required',
      })
    }
  })

export type LoginValues = z.infer<typeof loginSchema>

/** The `user` object carried by the login response. */
export const authUserResponseSchema = z.object({
  id: z.number(),
  account_id: z.number(),
  email: z.string(),
  name: z.string(),
  role_id: z.number().nullable(),
  /**
   * The tenant the token was minted for. The API only sends it for non-owner
   * accounts (`is_owner: false`); an owner signs in without a company and picks
   * one, so a missing key means the same thing as "none selected yet".
   */
  company_id: z.number().nullable().optional().default(null),
  is_owner: z.boolean(),
  /**
   * The company this account last worked in. Not a selection — the token is
   * still minted without a company for an owner — only a hint the company gate
   * uses to pre-highlight a choice. Absent on accounts that never selected one.
   */
  last_selected_company_id: z.number().nullable().optional().default(null),
})

/** Six digits, as both OTP endpoints require them. */
export const otpSchema = z.object({
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

export type OtpValues = z.infer<typeof otpSchema>

/** Shared by `POST /user/auth/login` and `POST /user/auth/refresh`. */
const tokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  /** Access-token lifetime in seconds. */
  expires_in: z.number(),
})

/**
 * A login that went all the way through: token pair plus the signed-in user.
 * `status` is absent on older deployments, so it is optional here and the union
 * below leans on the token instead of the tag.
 */
export const loginResponseSchema = tokenPairSchema.extend({
  status: z.literal('authenticated').optional(),
  /** Refresh-token lifetime in seconds — 30 days with "remember me", else 12h. */
  refresh_expires_in: z.number().optional(),
  user: authUserResponseSchema,
})

/** The `otp_expires_in` / `masked_email` / `message` trio both challenges carry. */
const otpChallengeFields = {
  /** OTP lifetime in seconds. */
  otp_expires_in: z.number().optional(),
  /** The address the code went to, partly hidden — e.g. `xp****@gmail.com`. */
  masked_email: z.string().optional(),
  message: z.string().optional(),
}

/**
 * The credentials were right but the address was never verified, so no token
 * pair is minted — the API mailed a code instead. Verifying it issues no token
 * either, so the screen replays the login afterwards.
 */
export const emailVerificationResponseSchema = z.object({
  status: z.literal('email_verification_required'),
  ...otpChallengeFields,
})

/**
 * The credentials were right and the user holds a second factor: a code went to
 * their address and `challenge_token` is the half of the login that
 * `POST /user/auth/verify-login-otp` spends alongside it. Single-use, and it
 * expires with the code.
 */
export const twoFactorChallengeResponseSchema = z.object({
  status: z.literal('two_factor_required'),
  challenge_token: z.string(),
  ...otpChallengeFields,
})

/**
 * Everything `POST /user/auth/login` — and `POST /user/auth/verify-login-otp`,
 * which answers with the same three — can resolve to. Only the first is a
 * session; the other two are the next step, not a failure.
 */
export const loginOutcomeResponseSchema = z.union([
  loginResponseSchema,
  emailVerificationResponseSchema,
  twoFactorChallengeResponseSchema,
])

/** `POST /user/auth/verify-email` — the address is now proved; no token. */
export const verifyEmailResponseSchema = z.object({
  email: z.string(),
  is_email_verified: z.literal(true),
  message: z.string().optional(),
})

/**
 * `POST /user/auth/resend-email-otp` — always 200, whatever the address.
 *
 * A resend asked for with a `challenge_token` (the two-factor branch) mints a
 * fresh challenge along with the code, so the reply carries a new token that
 * *replaces* the one it was asked with. The unverified-address branch has no
 * challenge to re-issue, so the field is absent there.
 */
export const resendEmailOtpResponseSchema = z.object({
  challenge_token: z.string().optional(),
  otp_expires_in: z.number().optional(),
  masked_email: z.string().optional(),
  message: z.string().optional(),
})

/** `POST /user/auth/refresh` — a rotated token pair, no user object. */
export const tokenResponseSchema = tokenPairSchema

export type AuthUserResponse = z.infer<typeof authUserResponseSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type EmailVerificationResponse = z.infer<
  typeof emailVerificationResponseSchema
>
export type TwoFactorChallengeResponse = z.infer<
  typeof twoFactorChallengeResponseSchema
>
export type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>
export type ResendEmailOtpResponse = z.infer<typeof resendEmailOtpResponseSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>

/**
 * `POST /user/me/verify-password` — the answer to "is this the caller's own
 * password". A wrong password lands here too, as `valid: false`, so the schema
 * covers both outcomes; only the rate-limit (429) leaves through a throw.
 */
export const verifyPasswordResponseSchema = z.object({
  valid: z.boolean(),
  attempts_remaining: z.number(),
  message: z.string(),
})

export type VerifyPasswordResponse = z.infer<typeof verifyPasswordResponseSchema>
