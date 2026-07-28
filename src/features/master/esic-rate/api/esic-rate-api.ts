import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import {
  esicRateFromFormValues,
  sortByEffectiveDateDesc,
} from '../lib/esic-rate-mappers'
import type { EsicRateFormValues } from '../schemas'
import type { EsicRate } from '../types'

/**
 * In-memory ESIC rate store. No backend yet — records live here for the session.
 * Swap each function's body for the matching REST call when the API lands; the
 * signatures stay the same.
 */

let esicRates: EsicRate[] = [
  {
    id: 1,
    wef: '2026-04-01',
    wageCeilingLimit: 21000,
    minimumRate: 176,
    employeeEsiContribution: 0.75,
    employerEsiContribution: 3.25,
    disabilityDuration: 2,
    disabilityWageLimit: 21000,
    contributionEndPeriod1: '09',
    contributionEndPeriod2: '03',
    createdBy: 'Roman Rings',
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedBy: 'Roman Rings',
    updatedAt: '2026-05-09T07:15:00.000Z',
  },
  {
    id: 2,
    wef: '2025-04-01',
    wageCeilingLimit: 21000,
    minimumRate: 137,
    employeeEsiContribution: 0.75,
    employerEsiContribution: 3.25,
    disabilityDuration: 2,
    disabilityWageLimit: 21000,
    contributionEndPeriod1: '09',
    contributionEndPeriod2: '03',
    createdBy: 'John Cena',
    createdAt: '2025-04-01T09:00:00.000Z',
    updatedBy: null,
    updatedAt: null,
  },
]

function nextId(): number {
  return esicRates.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

/**
 * Two slabs sharing an effective date would make the rate for that day
 * ambiguous, so the date is the master's natural key.
 */
function assertEffectiveDateFree(wef: string, ignoreId?: number) {
  const clash = esicRates.some((r) => r.wef === wef && r.id !== ignoreId)
  if (clash) throw new Error('An ESIC rate already exists for this effective date')
}

export async function fetchEsicRates(): Promise<EsicRate[]> {
  return mockDelay(sortByEffectiveDateDesc(esicRates))
}

export async function fetchEsicRate(id: number): Promise<EsicRate> {
  const found = esicRates.find((r) => r.id === id)
  if (!found) throw new Error('ESIC rate not found')
  return mockDelay({ ...found })
}

export async function createEsicRate(
  values: EsicRateFormValues,
): Promise<EsicRate> {
  assertEffectiveDateFree(values.wef)
  const record: EsicRate = {
    id: nextId(),
    ...esicRateFromFormValues(values),
    ...createdStamp(),
  }
  esicRates = [record, ...esicRates]
  return mockDelay({ ...record })
}

export async function updateEsicRate(
  id: number,
  values: EsicRateFormValues,
): Promise<EsicRate> {
  const index = esicRates.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('ESIC rate not found')
  assertEffectiveDateFree(values.wef, id)
  const updated: EsicRate = {
    ...esicRates[index],
    ...esicRateFromFormValues(values),
    ...updatedStamp(),
  }
  esicRates = esicRates.map((r) => (r.id === id ? updated : r))
  return mockDelay({ ...updated })
}

export async function deleteEsicRate(id: number): Promise<void> {
  esicRates = esicRates.filter((r) => r.id !== id)
  return mockDelay(undefined)
}
