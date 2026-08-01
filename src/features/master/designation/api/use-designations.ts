import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchDesignations } from './designation-api'

/**
 * GET /designations — the designation master list.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for dropdowns and history panels.
 */
export function useDesignations(params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.designation.list(params),
    queryFn: () => fetchDesignations(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
