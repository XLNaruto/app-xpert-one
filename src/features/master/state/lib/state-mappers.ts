import type { StateFormValues } from '../schemas'
import type { StateRecord } from '../types'

/** Hydrate the edit form from a stored state record. */
export function stateToFormValues(record: StateRecord): StateFormValues {
  return { stateName: record.stateName }
}
