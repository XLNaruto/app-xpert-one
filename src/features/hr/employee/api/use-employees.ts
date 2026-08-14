import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchEmployee, fetchEmployeePicker, fetchEmployees } from './employee-api'

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
 * GET /user/employees/list — the account's employees for a picker, by name.
 *
 * ACCOUNT-scoped, unlike `useEmployees`: it spans every company, which is what a
 * form naming a person outside the active tenant needs. `search` is matched
 * server-side, so pass the dropdown's own search box through it — each term is
 * its own cached result set, held briefly so re-opening the panel doesn't refetch.
 */
export function useEmployeePicker(search?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.employee.picker(search),
    queryFn: () => fetchEmployeePicker(search),
    // A form that already knows its employee (an edit) shouldn't pay for the
    // whole directory just to render a name it was given.
    enabled,
    // A typed term shouldn't blank the list while the next page arrives.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
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
