import { z } from 'zod'

/** Create/edit form for a district master record. */
export const districtSchema = z.object({
  state: z.string().trim().min(1, 'State is required'),
  districtName: z.string().trim().min(1, 'District name is required'),
})

export type DistrictFormValues = z.infer<typeof districtSchema>
