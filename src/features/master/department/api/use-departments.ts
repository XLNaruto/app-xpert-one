import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchDepartments } from './department-api'

/**
 * GET /user/departments — the active company’s departments, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for dropdowns and history panels.
 */
export function useDepartments(params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.department.list(params),
    queryFn: () => fetchDepartments(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
