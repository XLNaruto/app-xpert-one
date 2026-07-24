import { mockDelay } from '@/lib/utils'
import type { StateFormValues } from '../schemas'
import type { StateRecord } from '../types'

/**
 * In-memory state master store. No backend yet — records live here for the
 * session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 */

let states: StateRecord[] = [
  { id: 1, stateName: 'Gujarat', createdAt: '2025-01-10T09:00:00.000Z' },
  { id: 2, stateName: 'Maharashtra', createdAt: '2025-01-10T09:00:00.000Z' },
  { id: 3, stateName: 'Rajasthan', createdAt: '2025-01-10T09:00:00.000Z' },
]

function nextId(): number {
  return states.reduce((max, s) => Math.max(max, s.id), 0) + 1
}

export async function fetchStates(): Promise<StateRecord[]> {
  return mockDelay([...states])
}

export async function createState(values: StateFormValues): Promise<StateRecord> {
  const record: StateRecord = {
    id: nextId(),
    stateName: values.stateName.trim(),
    createdAt: new Date().toISOString(),
  }
  states = [record, ...states]
  return mockDelay({ ...record })
}

export async function updateState(
  id: number,
  values: StateFormValues,
): Promise<StateRecord> {
  const index = states.findIndex((s) => s.id === id)
  if (index === -1) throw new Error('State not found')
  const updated: StateRecord = {
    ...states[index],
    stateName: values.stateName.trim(),
  }
  states = states.map((s) => (s.id === id ? updated : s))
  return mockDelay({ ...updated })
}

export async function deleteState(id: number): Promise<void> {
  states = states.filter((s) => s.id !== id)
  return mockDelay(undefined)
}
