import type { AssetFormValues, AssetResponse, AssetUpdatePayload } from '../schemas'
import type { AssetRecord } from '../types'

/**
 * API record → the UI asset. The audit trail only comes back on the list rows;
 * on a single-record response it's absent and renders as a dash.
 */
export function toAsset(response: AssetResponse): AssetRecord {
  return {
    id: response.id,
    companyId: response.company_id,
    assetName: response.name,
    quantity: response.quantity ?? 0,
    isReturnable: response.is_returnable ?? true,
    // Absent on a single-record read — 0 there means "unknown", and the detail
    // screen takes the real count from the variants table's own `total`.
    variantCount: response.variant_count ?? 0,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at,
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a record between
 * tenants, so the update body stops here.
 *
 * `withStock` is false for an asset that HAS variants: sending either stock
 * field for one is a 409 ("quantity and returnable are set per variant"), so
 * the name travels alone.
 */
export function assetToPayload(
  values: AssetFormValues,
  withStock = true,
): AssetUpdatePayload {
  const name = values.assetName.trim()
  if (!withStock) return { name }
  return {
    name,
    quantity: Number(values.quantity),
    is_returnable: values.isReturnable,
  }
}

/** Hydrate the edit form from a stored asset record. */
export function assetToFormValues(record: AssetRecord): AssetFormValues {
  return {
    assetName: record.assetName,
    quantity: String(record.quantity),
    isReturnable: record.isReturnable,
  }
}
