import { z } from 'zod'

/**
 * `POST /user/me/two-factor/{enable,disable}` — the stored flag, after the
 * flip. Both endpoints answer with the same body.
 */
export const twoFactorResponseSchema = z.object({
  two_factor_auth: z.boolean(),
  message: z.string().optional(),
})

export type TwoFactorResponse = z.infer<typeof twoFactorResponseSchema>
