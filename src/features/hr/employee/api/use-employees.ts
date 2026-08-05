import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchEmployee, fetchEmployees } from './employee-api'

/**
 * GET /user/employees — the active company's employees, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with no
 * argument it returns everyone, for the pickers that point at an employee.
 */
export function useEmployees(params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.employee.list(params),
    queryFn: () => fetchEmployees(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /user/employees/:id — one employee with their current posting and the
 * `completed_steps` flags that drive the wizard's progress and tab locks.
 */
export function useEmployee(id: number) {
  return useQuery({
    queryKey: queryKeys.employee.detail(id),
    queryFn: () => fetchEmployee(id),
    enabled: Number.isFinite(id),
  })
}
