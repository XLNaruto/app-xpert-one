import { z } from 'zod'

/** One district as the API returns it (`GET /user/districts`). */
export const districtResponseSchema = z.object({
  id: z.number(),
  state_id: z.number(),
  name: z.string(),
  created_at: z.string(),
})

export type DistrictResponse = z.infer<typeof districtResponseSchema>

/** `GET /user/districts` — an offset-paginated page of districts. */
export const districtsResponseSchema = z.object({
  items: z.array(districtResponseSchema),
  total: z.number(),
})
