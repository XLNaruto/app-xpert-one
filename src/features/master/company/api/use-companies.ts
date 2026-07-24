import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchCompanies } from './company-api'

/** GET /companies — the full company master list. */
export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.company.list(),
    queryFn: fetchCompanies,
  })
}
