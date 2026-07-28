import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import { pfRateFromFormValues, sortByEffectiveDateDesc } from '../lib/pf-rate-mappers'
import type { PfRateFormValues } from '../schemas'
import type { PfRate } from '../types'

/**
 * In-memory PF rate store. No backend yet — records live here for the session.
 * Swap each function's body for the matching REST call when the API lands; the
 * signatures stay the same.
 */

let pfRates: PfRate[] = [
  {
    id: 1,
    wef: '2026-05-23',
    wageCeilingLimit: 15000,
    edliWageCeilingLimit: 15000,
    employeePfContribution: 12,
    employerPfContribution: 8.33,
    employerFpfContribution: 3.67,
    deduction: 12,
    adminCharges: 0.5,
    edliCharges: 0.5,
    edliAdminCharges: 0.01,
    minimumAdminCharges: 500,
    maximumEdliCharges: 75,
    minimumClosedAdminCharges: 75,
    minimumEdliClosedCharges: 25,
    pensionFundAgeLimit: 58,
    createdBy: 'Roman Rings',
    createdAt: '2026-05-23T09:00:00.000Z',
    updatedBy: 'Roman Rings',
    updatedAt: '2026-06-14T10:05:00.000Z',
  },
  {
    id: 2,
    wef: '2025-12-05',
    wageCeilingLimit: 15000,
    edliWageCeilingLimit: 15000,
    employeePfContribution: 12,
    employerPfContribution: 8.33,
    employerFpfContribution: 3.67,
    deduction: 12,
    adminCharges: 0.5,
    edliCharges: 0.5,
    edliAdminCharges: 0.01,
    minimumAdminCharges: 500,
    maximumEdliCharges: 75,
    minimumClosedAdminCharges: 75,
    minimumEdliClosedCharges: 25,
    pensionFundAgeLimit: 58,
    createdBy: 'John Cena',
    createdAt: '2025-12-05T09:00:00.000Z',
    updatedBy: null,
    updatedAt: null,
  },
]

function nextId(): number {
  return pfRates.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

/**
 * Two slabs sharing an effective date would make the rate for that day
 * ambiguous, so the date is the master's natural key.
 */
function assertEffectiveDateFree(wef: string, ignoreId?: number) {
  const clash = pfRates.some((r) => r.wef === wef && r.id !== ignoreId)
  if (clash) throw new Error('A PF rate already exists for this effective date')
}

export async function fetchPfRates(): Promise<PfRate[]> {
  return mockDelay(sortByEffectiveDateDesc(pfRates))
}

export async function fetchPfRate(id: number): Promise<PfRate> {
  const found = pfRates.find((r) => r.id === id)
  if (!found) throw new Error('PF rate not found')
  return mockDelay({ ...found })
}

export async function createPfRate(values: PfRateFormValues): Promise<PfRate> {
  assertEffectiveDateFree(values.wef)
  const record: PfRate = {
    id: nextId(),
    ...pfRateFromFormValues(values),
    ...createdStamp(),
  }
  pfRates = [record, ...pfRates]
  return mockDelay({ ...record })
}

export async function updatePfRate(
  id: number,
  values: PfRateFormValues,
): Promise<PfRate> {
  const index = pfRates.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('PF rate not found')
  assertEffectiveDateFree(values.wef, id)
  const updated: PfRate = {
    ...pfRates[index],
    ...pfRateFromFormValues(values),
    ...updatedStamp(),
  }
  pfRates = pfRates.map((r) => (r.id === id ? updated : r))
  return mockDelay({ ...updated })
}

export async function deletePfRate(id: number): Promise<void> {
  pfRates = pfRates.filter((r) => r.id !== id)
  return mockDelay(undefined)
}
