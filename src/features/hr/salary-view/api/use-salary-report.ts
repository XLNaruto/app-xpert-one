import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchSalaryReport } from './salary-view-api'
import type { SalaryViewFilters } from '../schemas'

/**
 * GET /user/salary/report — the month already processed.
 *
 * Everything that selects the report is in the key (company, period, department,
 * the employees it was narrowed to, the page and the search term), so switching
 * any of them is a different report rather than a refetch of this one.
 * `keepPreviousData` keeps the current page on screen while the next one loads,
 * so the table doesn't collapse to skeletons between pages.
 *
 * `employeeIds` is how the detail screen reads one person's month: the API
 * addresses a salary through its employee and period, so the same endpoint
 * answers both screens and the detail view needs no second key.
 */
export function useSalaryReport(
  filters: SalaryViewFilters,
  params: PageParams,
  { enabled = true, employeeIds }: { enabled?: boolean; employeeIds?: number[] } = {},
) {
  return useQuery({
    queryKey: queryKeys.salary.report(
      { ...filters, employeeIds: employeeIds ?? null },
      params,
    ),
    queryFn: () => fetchSalaryReport(filters, params, employeeIds),
    enabled,
    placeholderData: keepPreviousData,
  })
}
