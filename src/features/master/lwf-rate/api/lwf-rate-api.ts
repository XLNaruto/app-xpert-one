import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import { fetchStates } from '@/features/master/state'
import { lwfRateFromFormValues, sortByEffectiveDateDesc } from '../lib/lwf-rate-mappers'
import type { LwfRateFormValues } from '../schemas'
import type { LwfRate } from '../types'

/**
 * In-memory LWF rate store. No backend yet — records live here for the session.
 * Swap each function's body for the matching REST call when the API lands; the
 * signatures stay the same.
 */

let lwfRates: LwfRate[] = [
  {
    id: 1,
    wef: '2026-04-23',
    stateId: 1,
    stateName: 'Gujarat',
    month: '06',
    employeeContribution: 6,
    employerContribution: 12,
    createdBy: 'Roman Rings',
    createdAt: '2026-03-24T12:18:27.071Z',
    updatedBy: 'Roman Rings',
    updatedAt: '2026-04-28T11:25:32.772Z',
  },
  {
    id: 2,
    wef: '2026-02-04',
    stateId: 2,
    stateName: 'Maharashtra',
    month: '06',
    employeeContribution: 12,
    employerContribution: 36,
    createdBy: 'John Cena',
    createdAt: '2026-02-20T13:09:12.929Z',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: 3,
    wef: '2026-02-11',
    stateId: 3,
    stateName: 'Rajasthan',
    month: '12',
    employeeContribution: 2,
    employerContribution: 4,
    createdBy: 'John Cena',
    createdAt: '2026-02-18T10:40:55.860Z',
    updatedBy: null,
    updatedAt: null,
  },
]

function nextId(): number {
  return lwfRates.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

/**
 * A state can't have two rates starting the same day for the same collection
 * month — the contribution for that month would be ambiguous — so
 * (state, effective date, month) is the master's natural key.
 */
function assertRateSlotFree(
  stateId: number,
  wef: string,
  month: string,
  ignoreId?: number,
) {
  const clash = lwfRates.some(
    (r) =>
      r.stateId === stateId && r.wef === wef && r.month === month && r.id !== ignoreId,
  )
  if (clash) {
    throw new Error(
      'An LWF rate already exists for this state, effective date and month',
    )
  }
}

/** The stored record keeps the state's name, so resolve it from the master. */
async function resolveStateName(stateId: string): Promise<string> {
  const states = await fetchStates()
  const match = states.find((s) => s.id === Number(stateId))
  if (!match) throw new Error('Selected state no longer exists')
  return match.stateName
}

export async function fetchLwfRates(): Promise<LwfRate[]> {
  return mockDelay(sortByEffectiveDateDesc(lwfRates))
}

export async function fetchLwfRate(id: number): Promise<LwfRate> {
  const found = lwfRates.find((r) => r.id === id)
  if (!found) throw new Error('LWF rate not found')
  return mockDelay({ ...found })
}

export async function createLwfRate(values: LwfRateFormValues): Promise<LwfRate> {
  const stateName = await resolveStateName(values.stateId)
  assertRateSlotFree(Number(values.stateId), values.wef, values.month)
  const record: LwfRate = {
    id: nextId(),
    ...lwfRateFromFormValues(values, stateName),
    ...createdStamp(),
  }
  lwfRates = [record, ...lwfRates]
  return mockDelay({ ...record })
}

export async function updateLwfRate(
  id: number,
  values: LwfRateFormValues,
): Promise<LwfRate> {
  const index = lwfRates.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('LWF rate not found')
  const stateName = await resolveStateName(values.stateId)
  assertRateSlotFree(Number(values.stateId), values.wef, values.month, id)
  const updated: LwfRate = {
    ...lwfRates[index],
    ...lwfRateFromFormValues(values, stateName),
    ...updatedStamp(),
  }
  lwfRates = lwfRates.map((r) => (r.id === id ? updated : r))
  return mockDelay({ ...updated })
}

export async function deleteLwfRate(id: number): Promise<void> {
  lwfRates = lwfRates.filter((r) => r.id !== id)
  return mockDelay(undefined)
}
