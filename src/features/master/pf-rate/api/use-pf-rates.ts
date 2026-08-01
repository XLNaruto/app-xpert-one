import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchPfRates } from './pf-rate-api'

/**
 * GET /user/pf-rates — PF rate slabs, newest effective date first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for the form's history panel.
 */
export function usePfRates(params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.pfRate.list(params),
    queryFn: () => fetchPfRates(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
