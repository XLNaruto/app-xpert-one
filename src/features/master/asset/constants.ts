import type { AssetFormValues, AssetVariantFormValues, StockChangeFormValues } from './schemas'

/**
 * The `sort` values `/user/assets` accepts. Sorting is server-side, so a column
 * is sortable only if it appears here — the list gives each of these columns the
 * API's field name as its column id, and marks the rest unsortable.
 */
export const ASSET_SORT = {
  assetName: 'name',
  createdAt: 'created_at',
} as const

/**
 * Newest asset first — the order the list opens in and reverts to. This is not
 * the endpoint's own default (name A→Z), so it's always sent.
 */
export const ASSET_DEFAULT_SORT = { id: ASSET_SORT.createdAt, desc: true }

/**
 * Blank form values for a new asset.
 *
 * Stock opens at nothing and `isReturnable` opens OFF, the same way a new
 * variant does — an asset that's about to be given variants leaves both alone,
 * since the variants will hold the stock from then on.
 */
export const EMPTY_ASSET_FORM: AssetFormValues = {
  assetName: '',
  quantity: '0',
  isReturnable: false,
}

/* ── Variants ────────────────────────────────────────────────────────────── */

/**
 * The `sort` values `/user/assets/:id/variants` accepts. Same contract as the
 * asset list: a column is sortable only if it appears here, and it carries the
 * API's own field name as its column id.
 */
export const ASSET_VARIANT_SORT = {
  variantName: 'name',
  quantity: 'quantity',
  createdAt: 'created_at',
} as const

/** Name A→Z — the endpoint's own default, and the order the table opens in. */
export const ASSET_VARIANT_DEFAULT_SORT = { id: ASSET_VARIANT_SORT.variantName, desc: false }

/**
 * Blank form values for a new variant.
 *
 * `isReturnable` opens OFF, so a variant only ever comes back if someone said it
 * does. The API's own default is `true`, but the payload always carries the flag
 * explicitly — this is what a new variant gets, not what the server assumes.
 */
export const EMPTY_ASSET_VARIANT_FORM: AssetVariantFormValues = {
  variantName: '',
  quantity: '0',
  isReturnable: false,
}

/* ── Stock ───────────────────────────────────────────────────────────────── */

/** The `sort` values the stock ledger accepts. */
export const STOCK_MOVEMENT_SORT = {
  createdAt: 'created_at',
  change: 'change',
} as const

/** Newest line first — the endpoint's own default, sent all the same. */
export const STOCK_MOVEMENT_DEFAULT_SORT = { id: STOCK_MOVEMENT_SORT.createdAt, desc: true }

/** A blank stock form — it opens on a refill, the common case. */
export const EMPTY_STOCK_CHANGE_FORM: StockChangeFormValues = {
  direction: 'in',
  quantity: '',
  note: '',
}

/** The badge tones a ledger line can take. */
export type StockReasonTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'secondary'

/**
 * How each ledger reason is worded and coloured.
 *
 * The reason is derived by the server, so this is a read-only vocabulary — the
 * UI never sends one. `ADJUSTMENT` is deliberately absent: it covers both a
 * manual write-off and an edit to the quantity box, so it can go either way and
 * is worded from the sign of the change instead — see `stockReasonMeta()`.
 */
export const STOCK_REASON_META: Record<
  string,
  { label: string; description: string; variant: StockReasonTone }
> = {
  OPENING: {
    label: 'Opening',
    description: 'The variant was created holding stock.',
    variant: 'secondary',
  },
  REFILL: {
    label: 'Stock Added',
    description: 'Units bought in.',
    variant: 'success',
  },
  ASSIGNED: {
    label: 'Assigned',
    description: 'A unit went out to an employee.',
    variant: 'default',
  },
  RETURNED: {
    label: 'Returned',
    description: 'An employee handed a unit back.',
    variant: 'success',
  },
  UNASSIGNED: {
    label: 'Unassigned',
    description: 'A handout row was deleted while it still held a unit.',
    variant: 'secondary',
  },
}
