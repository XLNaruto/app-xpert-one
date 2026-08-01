/** A district master record. */
export interface DistrictRecord {
  id: number
  /** Parent state id — what the API stores and what a cascade filters on. */
  stateId: number
  /**
   * Parent state name, joined in from the state master for the screens that
   * still hold a state by name rather than by id. Blank when unresolvable.
   */
  state: string
  districtName: string
  createdAt: string
}
