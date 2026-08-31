import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/stores/auth-store'
import { useCompanyStore } from '@/stores/company-store'
import { fetchMyCompanies } from './company-api'
import { mockFetchMyCompanies } from './company-mock'
import type { MyCompaniesState } from '../types'

/**
 * `GET /user/my/companies` — the caller's tenants, combined with the active
 * selection the session carries (`AuthUser.companyId`, set at login and by
 * `select-company`). The resolved company is mirrored into the global company
 * store so the topbar can render it synchronously on first paint.
 *
 * Mounted inside the authenticated shell, so it runs right after login.
 */
export function useMyCompanies() {
  const setSelectedCompany = useCompanyStore((s) => s.setSelectedCompany)
  const activeCompanyId = useAuthStore((s) => s.user?.companyId ?? null)
  // Whether select-company has actually run for this session — see the store.
  const companySelected = useAuthStore((s) => s.companySelected)

  const query = useQuery({
    queryKey: queryKeys.myCompany.list(),
    queryFn: () =>
      env.VITE_USE_MOCK_API ? mockFetchMyCompanies() : fetchMyCompanies(),
    staleTime: 5 * 60 * 1000,
  })

  const companies = query.data ?? []
  // Once the list is in, an id that isn't in it is stale (membership revoked) —
  // treat it as no selection. Before then, trust the session's own value so the
  // gate doesn't flash for an already-selected user.
  const isStale =
    activeCompanyId != null &&
    companies.length > 0 &&
    !companies.some((c) => c.id === activeCompanyId)
  const selectedCompanyId = isStale ? null : activeCompanyId
  // A login response carries the member's own `company_id`, but the token isn't
  // scoped to it until `select-company` runs — so the gate asks whenever this
  // session hasn't submitted a selection yet, not just when the id is missing.
  const requiresSelection =
    query.isSuccess &&
    companies.length > 0 &&
    (selectedCompanyId == null || !companySelected)

  const active = companies.find((c) => c.id === selectedCompanyId)
  useEffect(() => {
    if (selectedCompanyId == null || !active) return
    setSelectedCompany(selectedCompanyId, active.name, active.logo)
  }, [selectedCompanyId, active, setSelectedCompany])

  const state: MyCompaniesState = { companies, selectedCompanyId, requiresSelection }
  return { ...query, ...state }
}
