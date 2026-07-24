import { z } from 'zod'

/** Basic email shape — kept as a regex to stay version-agnostic across zod. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Email + password sign-in. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .regex(EMAIL_RE, 'Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
})

export type LoginValues = z.infer<typeof loginSchema>

/** Step 1 — request an OTP for the account email. */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .regex(EMAIL_RE, 'Enter a valid email address'),
})

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

/** Step 2 — verify the 6-digit OTP. */
export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be digits only'),
})

export type VerifyOtpValues = z.infer<typeof verifyOtpSchema>

/** Step 3 — set a new password. */
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
