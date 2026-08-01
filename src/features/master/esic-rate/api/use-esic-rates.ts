import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchEsicRates } from './esic-rate-api'

/**
 * GET /esic-rates — every ESIC rate slab, newest effective date first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for dropdowns and history panels.
 */
export function useEsicRates(params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.esicRate.list(params),
    queryFn: () => fetchEsicRates(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
