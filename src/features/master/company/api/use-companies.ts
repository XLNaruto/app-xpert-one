import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchCompanies } from './company-api'

/**
 * GET /companies — the full company master list.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for dropdowns and history panels.
 */
export function useCompanies(params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.company.list(params),
    queryFn: () => fetchCompanies(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
