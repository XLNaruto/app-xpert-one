import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchCompanyLimit } from './company-api'

/**
 * GET /user/companies/limit — how many companies the plan allows and whether
 * one more can be created. Read when the Company screen opens; refreshed by
 * every create/delete since its key sits under `company.all`.
 */
export function useCompanyLimit(enabled = true) {
  return useQuery({
    queryKey: queryKeys.company.limit(),
    queryFn: fetchCompanyLimit,
    enabled,
  })
}
