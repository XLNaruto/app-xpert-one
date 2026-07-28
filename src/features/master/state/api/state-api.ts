import { mockDelay } from '@/lib/utils'
import type { StateRecord } from '../types'

/**
 * State lookup source. States are maintained by the super admin, so this
 * module is read-only — it only feeds the state dropdowns in other masters.
 * Swap the function's body for the matching REST call when the API lands.
 */

const states: StateRecord[] = [
  { id: 1, stateName: 'Gujarat', createdAt: '2025-01-10T09:00:00.000Z' },
  { id: 2, stateName: 'Maharashtra', createdAt: '2025-01-10T09:00:00.000Z' },
  { id: 3, stateName: 'Rajasthan', createdAt: '2025-01-10T09:00:00.000Z' },
]

export async function fetchStates(): Promise<StateRecord[]> {
  return mockDelay([...states])
}
