import { z } from 'zod'

/** Username + password sign-in. */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
})

export type LoginValues = z.infer<typeof loginSchema>
