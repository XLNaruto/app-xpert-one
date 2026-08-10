import { useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryKeys } from '@/lib/query-keys'
import { refreshAccessToken } from '@/lib/auth-refresh'
import { useAuthStore } from '@/stores/auth-store'
import { useCompanyStore } from '@/stores/company-store'
import { selectMyCompany } from './company-api'
import { mockSelectMyCompany } from './company-mock'
import type { MyCompany } from '../types'

/**
 * `POST /user/auth/select-company` — switch the active company (tenant). On
 * success we:
 *  1. rotate the token pair, because the access token is minted with the active
 *     company on it and `/user/auth/refresh` re-reads it — without this the next
 *     request would still be scoped to the previous tenant. Best-effort: the
 *     selection is already stored against the session, so a failed rotation must
 *     not fail the switch (the 401 interceptor will refresh reactively).
 *  2. record the new company on the session and mirror it for the topbar, and
 *  3. invalidate every other query so all tenant-scoped data refetches.
 */
export function useSelectCompany() {
  const queryClient = useQueryClient()
  const setActiveCompany = useAuthStore((s) => s.setActiveCompany)
  const setSelectedCompany = useCompanyStore((s) => s.setSelectedCompany)

  return useMutation<MyCompany, Error, number>({
    mutationFn: async (companyId) => {
      const company = env.VITE_USE_MOCK_API
        ? await mockSelectMyCompany(companyId)
        : await selectMyCompany(companyId)
      if (!env.VITE_USE_MOCK_API) {
        await refreshAccessToken().catch(() => undefined)
      }
      return company
    },
    onSuccess: (company) => {
      setActiveCompany(company.id)
      setSelectedCompany(company.id, company.name, company.logo)

      // Everything else is tenant-scoped — drop it so it refetches for the new
      // company. The companies list itself is unaffected by the switch.
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== queryKeys.myCompany.all[0],
      })
    },
  })
}
