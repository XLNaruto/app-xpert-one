/** A state master record. */
export interface StateRecord {
  id: number
  stateName: string
  /** The state's short code, or `null` when the master doesn't carry one. */
  code: string | null
  createdAt: string
}
