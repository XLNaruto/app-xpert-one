import { mockDelay } from '@/lib/utils'
import type { DistrictRecord } from '../types'

/**
 * District lookup source. Districts are maintained by the super admin, so this
 * module is read-only — it only feeds the district dropdowns in other masters.
 * Swap the function's body for the matching REST call when the API lands.
 */

const districts: DistrictRecord[] = [
  { id: 1, state: 'Gujarat', districtName: 'Surat', createdAt: '2025-01-11T09:00:00.000Z' },
  { id: 2, state: 'Gujarat', districtName: 'Ahmedabad', createdAt: '2025-01-11T09:00:00.000Z' },
  { id: 3, state: 'Maharashtra', districtName: 'Mumbai', createdAt: '2025-01-11T09:00:00.000Z' },
]

export async function fetchDistricts(): Promise<DistrictRecord[]> {
  return mockDelay([...districts])
}
