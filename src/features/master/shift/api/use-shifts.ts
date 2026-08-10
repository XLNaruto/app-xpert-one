import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchShifts } from './shift-api'

/**
 * GET /user/shifts — a company's shifts, earliest start first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with no
 * params it returns the whole master, which is what the department screen's
 * dropdown reads.
 *
 * `companyId` is the company on screen. It's required in practice: both shift
 * screens sit inside a master that edits a company other than the session's, so
 * the query stays disabled until one is known.
 */
export function useShifts(params: PageParams = ALL_ROWS, companyId?: number) {
  return useQuery({
    queryKey: queryKeys.shift.list(params, companyId),
    queryFn: () => fetchShifts(params, companyId),
    enabled: companyId !== undefined,
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
