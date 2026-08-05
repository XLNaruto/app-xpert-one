import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchDesignations } from './designation-api'

/**
 * GET /user/designations — the active company's designations, newest first.
 * Titles only: a list row carries no pay, which comes from the detail read.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for dropdowns and history panels.
 */
export function useDesignations(params: PageParams = ALL_ROWS, companyId?: number) {
  return useQuery({
    queryKey: queryKeys.designation.list(params, companyId),
    queryFn: () => fetchDesignations(params, companyId),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
