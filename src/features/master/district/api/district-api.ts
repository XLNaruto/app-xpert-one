import { mockDelay } from '@/lib/utils'
import type { DistrictFormValues } from '../schemas'
import type { DistrictRecord } from '../types'

/**
 * In-memory district master store. No backend yet — records live here for the
 * session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 */

let districts: DistrictRecord[] = [
  { id: 1, state: 'Gujarat', districtName: 'Surat', createdAt: '2025-01-11T09:00:00.000Z' },
  { id: 2, state: 'Gujarat', districtName: 'Ahmedabad', createdAt: '2025-01-11T09:00:00.000Z' },
  { id: 3, state: 'Maharashtra', districtName: 'Mumbai', createdAt: '2025-01-11T09:00:00.000Z' },
]

function nextId(): number {
  return districts.reduce((max, d) => Math.max(max, d.id), 0) + 1
}

export async function fetchDistricts(): Promise<DistrictRecord[]> {
  return mockDelay([...districts])
}

export async function createDistrict(
  values: DistrictFormValues,
): Promise<DistrictRecord> {
  const record: DistrictRecord = {
    id: nextId(),
    state: values.state.trim(),
    districtName: values.districtName.trim(),
    createdAt: new Date().toISOString(),
  }
  districts = [record, ...districts]
  return mockDelay({ ...record })
}

export async function updateDistrict(
  id: number,
  values: DistrictFormValues,
): Promise<DistrictRecord> {
  const index = districts.findIndex((d) => d.id === id)
  if (index === -1) throw new Error('District not found')
  const updated: DistrictRecord = {
    ...districts[index],
    state: values.state.trim(),
    districtName: values.districtName.trim(),
  }
  districts = districts.map((d) => (d.id === id ? updated : d))
  return mockDelay({ ...updated })
}

export async function deleteDistrict(id: number): Promise<void> {
  districts = districts.filter((d) => d.id !== id)
  return mockDelay(undefined)
}
