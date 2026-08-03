import { z } from 'zod'

/** Create/edit form for an asset master record. */
export const assetSchema = z.object({
  assetName: z
    .string()
    .trim()
    .min(1, 'Asset name is required')
    .max(200, 'Asset name cannot exceed 200 characters'),
})

export type AssetFormValues = z.infer<typeof assetSchema>

/**
 * One asset as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/assets` and
 * `GET/PATCH /user/assets/:id` answer with the record's own columns only —
 * hence the optional audit fields, which the mapper reads as an empty trail.
 */
export const assetResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  created_at: z.string(),
  created_by_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
})

/** `GET /user/assets` — an offset-paginated page of assets. */
export const assetsResponseSchema = z.object({
  items: z.array(assetResponseSchema),
  total: z.number(),
})

export type AssetResponse = z.infer<typeof assetResponseSchema>

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent.
 */
export interface AssetPayload {
  company_id: number
  name: string
}

/** The update body — the name alone; a record can't move between tenants. */
export type AssetUpdatePayload = Omit<AssetPayload, 'company_id'>
