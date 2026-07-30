import { mockDelay } from '@/lib/utils'
import type { MyCompany } from '../types'

/**
 * Demo tenants for `VITE_USE_MOCK_API=true` (no backend reachable). The active
 * selection isn't mocked here — it lives on `AuthUser.companyId` exactly as it
 * does against the real API, so the gate and switcher take the same path.
 */
const MOCK_COMPANIES: MyCompany[] = [
  { id: 1, name: 'XpertLab Technologies', code: 'XPL001', logo: null },
  { id: 2, name: 'Rajani Group', code: 'RJG002', logo: null },
]

export async function mockFetchMyCompanies(): Promise<MyCompany[]> {
  return mockDelay(MOCK_COMPANIES.map((c) => ({ ...c })))
}

export async function mockSelectMyCompany(companyId: number): Promise<MyCompany> {
  const found = MOCK_COMPANIES.find((c) => c.id === companyId)
  if (!found) throw new Error('Company not found')
  return mockDelay({ ...found })
}
