import { z } from 'zod'

/** Create/edit form for an asset master record. */
export const assetSchema = z.object({
  assetName: z.string().trim().min(1, 'Asset name is required'),
})

export type AssetFormValues = z.infer<typeof assetSchema>
