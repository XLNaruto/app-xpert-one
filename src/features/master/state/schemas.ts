import { z } from 'zod'

/** Create/edit form for a state master record. */
export const stateSchema = z.object({
  stateName: z.string().trim().min(1, 'State name is required'),
})

export type StateFormValues = z.infer<typeof stateSchema>
