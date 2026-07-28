import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import { fetchStates } from '@/features/master/state'
import { ptRateFromFormValues, sortByEffectiveDateDesc } from '../lib/pt-rate-mappers'
import type { PtRateFormValues } from '../schemas'
import type { PtRate } from '../types'

/**
 * In-memory PT rate store. No backend yet — records live here for the session.
 * Swap each function's body for the matching REST call when the API lands; the
 * signatures stay the same.
 */

let ptRates: PtRate[] = [
  {
    id: 1,
    wef: '2026-04-01',
    stateId: 1,
    stateName: 'Gujarat',
    detail: 'Revised Gujarat PT slabs',
    slabs: [
      {
        minSalary: 0,
        maxSalary: 11999,
        amount: 0,
        month: '0',
        gender: 'Both',
        minAge: null,
      },
      {
        minSalary: 12000,
        maxSalary: null,
        amount: 200,
        month: '0',
        gender: 'Both',
        minAge: null,
      },
    ],
    createdBy: 'Roman Rings',
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedBy: 'John Cena',
    updatedAt: '2026-04-28T11:25:32.772Z',
  },
  {
    id: 2,
    wef: '2025-04-01',
    stateId: 2,
    stateName: 'Maharashtra',
    detail: 'Maharashtra PT — February carries the annual balance',
    slabs: [
      {
        minSalary: 0,
        maxSalary: 7500,
        amount: 0,
        month: '0',
        gender: 'Male',
        minAge: null,
      },
      {
        minSalary: 7501,
        maxSalary: 10000,
        amount: 175,
        month: '0',
        gender: 'Male',
        minAge: null,
      },
      {
        minSalary: 10001,
        maxSalary: null,
        amount: 200,
        month: '01',
        gender: 'Male',
        minAge: null,
      },
      {
        minSalary: 10001,
        maxSalary: null,
        amount: 300,
        month: '02',
        gender: 'Male',
        minAge: null,
      },
    ],
    createdBy: 'John Cena',
    createdAt: '2025-04-01T09:00:00.000Z',
    updatedBy: null,
    updatedAt: null,
  },
]

function nextId(): number {
  return ptRates.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

/**
 * A state can't have two rates starting the same day — the rate for that date
 * would be ambiguous — so (state, effective date) is the master's natural key.
 */
function assertEffectiveDateFree(stateId: number, wef: string, ignoreId?: number) {
  const clash = ptRates.some(
    (r) => r.stateId === stateId && r.wef === wef && r.id !== ignoreId,
  )
  if (clash) {
    throw new Error('A PT rate already exists for this state and effective date')
  }
}

/** The stored record keeps the state's name, so resolve it from the master. */
async function resolveStateName(stateId: string): Promise<string> {
  const states = await fetchStates()
  const match = states.find((s) => s.id === Number(stateId))
  if (!match) throw new Error('Selected state no longer exists')
  return match.stateName
}

export async function fetchPtRates(): Promise<PtRate[]> {
  return mockDelay(sortByEffectiveDateDesc(ptRates))
}

export async function fetchPtRate(id: number): Promise<PtRate> {
  const found = ptRates.find((r) => r.id === id)
  if (!found) throw new Error('PT rate not found')
  return mockDelay({ ...found })
}

export async function createPtRate(values: PtRateFormValues): Promise<PtRate> {
  const stateName = await resolveStateName(values.stateId)
  assertEffectiveDateFree(Number(values.stateId), values.wef)
  const record: PtRate = {
    id: nextId(),
    ...ptRateFromFormValues(values, stateName),
    ...createdStamp(),
  }
  ptRates = [record, ...ptRates]
  return mockDelay({ ...record })
}

export async function updatePtRate(
  id: number,
  values: PtRateFormValues,
): Promise<PtRate> {
  const index = ptRates.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('PT rate not found')
  const stateName = await resolveStateName(values.stateId)
  assertEffectiveDateFree(Number(values.stateId), values.wef, id)
  const updated: PtRate = {
    ...ptRates[index],
    ...ptRateFromFormValues(values, stateName),
    ...updatedStamp(),
  }
  ptRates = ptRates.map((r) => (r.id === id ? updated : r))
  return mockDelay({ ...updated })
}

export async function deletePtRate(id: number): Promise<void> {
  ptRates = ptRates.filter((r) => r.id !== id)
  return mockDelay(undefined)
}
