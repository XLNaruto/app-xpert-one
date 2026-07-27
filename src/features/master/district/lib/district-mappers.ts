import type { DistrictFormValues } from '../schemas'
import type { DistrictRecord } from '../types'

/** Hydrate the edit form from a stored district record. */
export function districtToFormValues(record: DistrictRecord): DistrictFormValues {
  return { state: record.state, districtName: record.districtName }
}
