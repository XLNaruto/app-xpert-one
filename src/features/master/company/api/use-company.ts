import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchCompany } from './company-api'

/** GET /user/companies/:id — a single company record. */
export function useCompany(id: number) {
  return useQuery({
    queryKey: queryKeys.company.detail(id),
    queryFn: () => fetchCompany(id),
    enabled: Number.isFinite(id),
  })
}
