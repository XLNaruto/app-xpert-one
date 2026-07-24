/** A district master record. */
export interface DistrictRecord {
  id: number
  /** Parent state name (from the state master). */
  state: string
  districtName: string
  createdAt: string
}
