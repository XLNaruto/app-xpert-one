import type { AssetFormValues } from '../schemas'
import type { AssetRecord } from '../types'

/** Hydrate the edit form from a stored asset record. */
export function assetToFormValues(record: AssetRecord): AssetFormValues {
  return { assetName: record.assetName }
}
