import type { AssetFormValues } from './schemas'

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

/** Blank form values for a new asset. */
export const EMPTY_ASSET_FORM: AssetFormValues = {
  assetName: '',
}
