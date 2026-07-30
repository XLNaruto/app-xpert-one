import { z } from 'zod'

/** Username + password sign-in (mirrors the login request body). */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
})

export type LoginValues = z.infer<typeof loginSchema>

/** The `user` object carried by the login response. */
export const authUserResponseSchema = z.object({
  id: z.number(),
  account_id: z.number(),
  email: z.string(),
  username: z.string(),
  name: z.string(),
  role_id: z.number().nullable(),
  company_id: z.number().nullable(),
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

/** `POST /user/auth/refresh` — a rotated token pair, no user object. */
export const tokenResponseSchema = tokenPairSchema

export type AuthUserResponse = z.infer<typeof authUserResponseSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>
