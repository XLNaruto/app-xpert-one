import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchPtRates } from './pt-rate-api'

/**
 * GET /user/pt-rates — PT rates with their salary slabs, newest effective
 * date first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for dropdowns and history panels.
 */
export function usePtRates(params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.ptRate.list(params),
    queryFn: () => fetchPtRates(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
