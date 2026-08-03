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
 */
export function assetToPayload(values: AssetFormValues): AssetUpdatePayload {
  return { name: values.assetName.trim() }
}

/** Hydrate the edit form from a stored asset record. */
export function assetToFormValues(record: AssetRecord): AssetFormValues {
  return { assetName: record.assetName }
}
