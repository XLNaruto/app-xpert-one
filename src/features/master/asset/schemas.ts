import { z } from 'zod'
import { recordNameField, text, wholeNumberField } from '@/lib/validation'

/**
 * Create/edit form for an asset master record.
 *
 * Asset names are product names — "T-shirt", "Nuts & Bolts", "Uniform (Large)" —
 * so the punctuation a catalogue actually uses is allowed here.
 */
export const assetSchema = z.object({
  assetName: recordNameField('the asset name', { max: 200, allowSpecial: true }),
  /**
   * The asset's OWN stock — what it holds when it has no variants.
   *
   * An asset holds stock or its variants do, never both: once a variant exists
   * this is forced to 0 and frozen server-side, and the form stops offering it.
   * Like a variant's, the number here is an absolute level, not a delta.
   */
  quantity: wholeNumberField({ required: true, label: 'a quantity', max: 9 }),
  isReturnable: z.boolean(),
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
  /** The asset's own stock — always 0 once it has variants. */
  quantity: z.number().nullish(),
  is_returnable: z.boolean().nullish(),
  /**
   * How many variants hang off this asset. **List rows only** — a single-record
   * response (`POST`, `GET /assets/:id`, `PATCH`) carries no such field, which
   * is why it's optional here and why the detail screen takes the count from the
   * variants table's own `total` instead.
   */
  variant_count: z.number().nullish(),
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
  /**
   * Both optional server-side (`0` / `true`). They're sent all the same, so a
   * new asset gets what the form shows rather than what the server assumes —
   * except on an asset that has variants, where they're refused with a 409 and
   * the api layer leaves them off.
   */
  quantity: number
  is_returnable: boolean
}

/**
 * The update body — a record can't move between tenants, so no `company_id`.
 *
 * The two stock fields are optional because an asset that HAS variants must be
 * patched without them: sending either is a 409, since quantity and returnable
 * are set per variant from that point on.
 */
export type AssetUpdatePayload = Partial<Omit<AssetPayload, 'company_id' | 'name'>> & {
  name: string
}

/* ── Variants ────────────────────────────────────────────────────────────── */

/**
 * Create/edit form for a variant — the countable thing under an asset.
 *
 * `quantity` is held as a string because that's what a text input gives us, and
 * it is an **absolute level**, not a delta: the API records the difference from
 * the stored balance as an `ADJUSTMENT`. Moving stock deliberately (a refill or
 * a write-off) goes through the stock form below instead.
 */
export const assetVariantSchema = z.object({
  // Sizes are the common case, and `S` / `M` / `L` are whole names.
  variantName: recordNameField('the variant name', {
    max: 200,
    allowSpecial: true,
    min: 1,
  }),
  quantity: wholeNumberField({ required: true, label: 'a quantity', max: 9 }),
  isReturnable: z.boolean(),
})

export type AssetVariantFormValues = z.infer<typeof assetVariantSchema>

/**
 * Refill / write-off.
 *
 * The API takes a **signed delta**, never a new level — so the form asks the two
 * questions that make one up: which way the stock is moving, and by how much.
 * The mapper composes the sign; `0` moves nothing and is refused here as it is
 * server-side.
 */
export const stockChangeSchema = z.object({
  /** `in` refills (positive), `out` writes off (negative). */
  direction: z.enum(['in', 'out']),
  quantity: wholeNumberField({ required: true, label: 'a quantity', max: 9 }).refine(
    (value) => Number(value) > 0,
    'Enter a quantity greater than zero',
  ),
  note: text(500),
})

export type StockChangeFormValues = z.infer<typeof stockChangeSchema>

/** One variant as the API returns it. */
export const assetVariantResponseSchema = z.object({
  id: z.number(),
  asset_id: z.number(),
  name: z.string(),
  quantity: z.number(),
  is_returnable: z.boolean(),
  created_at: z.string().nullable().optional(),
  created_by_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
})

export type AssetVariantResponse = z.infer<typeof assetVariantResponseSchema>

/** `GET /user/assets/:assetId/variants` — an offset-paginated page. */
export const assetVariantsResponseSchema = z.object({
  items: z.array(assetVariantResponseSchema),
  total: z.number(),
})

/** One ledger line. `change` is signed and `balance_after` is what it left behind. */
export const stockMovementResponseSchema = z.object({
  id: z.number(),
  asset_id: z.number().nullish(),
  /**
   * `null` on a line about the asset itself. The asset's history is ONE ledger —
   * its own lines and its variants' — so an asset that later grew variants keeps
   * the story of what it did before them.
   */
  variant_id: z.number().nullish(),
  /** Sent where the API resolves it; otherwise the screen names it from the variants list. */
  variant_name: z.string().nullish(),
  change: z.number(),
  balance_after: z.number(),
  reason: z.string(),
  employee_asset_id: z.number().nullable().optional(),
  employee_id: z.number().nullable().optional(),
  /** Sent on handout-driven lines where the API resolves it; the ledger says
      "Employee" when it doesn't. */
  employee_name: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_by_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
})

export type StockMovementResponse = z.infer<typeof stockMovementResponseSchema>

export const stockMovementsResponseSchema = z.object({
  items: z.array(stockMovementResponseSchema),
  total: z.number(),
})

/** `POST .../variants/:id/stock` answers with both halves — no re-fetch needed. */
export const stockChangeResponseSchema = z.object({
  variant: assetVariantResponseSchema,
  movement: stockMovementResponseSchema,
})

/** `POST /user/assets/:id/stock` — the asset-level twin, same shape. */
export const assetStockChangeResponseSchema = z.object({
  asset: assetResponseSchema,
  movement: stockMovementResponseSchema,
})

/**
 * The variant create body. The owning asset comes from the URL — an `asset_id`
 * in the body is ignored, so it isn't sent.
 */
export interface AssetVariantPayload {
  name: string
  quantity: number
  is_returnable: boolean
}

/** The edit body — every field optional; the owning asset can't be changed. */
export type AssetVariantUpdatePayload = Partial<AssetVariantPayload>

/** The refill / write-off body. */
export interface StockChangePayload {
  change: number
  note?: string
}
