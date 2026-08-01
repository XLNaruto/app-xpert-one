import { z } from 'zod'

/**
 * One state as the API returns it (`GET /user/states`). `code` is the state's
 * short code and is nullable; `created_at` is the only audit field.
 */
export const stateResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string().nullable(),
  created_at: z.string(),
})

export type StateResponse = z.infer<typeof stateResponseSchema>

/** `GET /user/states` — an offset-paginated page of states. */
export const statesResponseSchema = z.object({
  items: z.array(stateResponseSchema),
  total: z.number(),
})
