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

/** Shared by `POST /user/auth/login` and `POST /user/auth/refresh`. */
const tokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  /** Access-token lifetime in seconds. */
  expires_in: z.number(),
})

/** `POST /user/auth/login` — token pair plus the signed-in user. */
export const loginResponseSchema = tokenPairSchema.extend({
  user: authUserResponseSchema,
})

/**
 * The other `200` a login can answer with: the credentials were right but the
 * address was never verified, so no token pair is minted — the API mailed an
 * OTP instead and says so in `message`. Told apart from a real session by the
 * `status` key, which a successful login never carries.
 */
export const loginPendingResponseSchema = z.object({
  status: z.literal('email_verification_required'),
  /** OTP lifetime in seconds. */
  otp_expires_in: z.number().optional(),
  /** The address the code went to, partly hidden — e.g. `xp****@gmail.com`. */
  masked_email: z.string().optional(),
  message: z.string().optional(),
})

/** `POST /user/auth/refresh` — a rotated token pair, no user object. */
export const tokenResponseSchema = tokenPairSchema

export type AuthUserResponse = z.infer<typeof authUserResponseSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type LoginPendingResponse = z.infer<typeof loginPendingResponseSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>
