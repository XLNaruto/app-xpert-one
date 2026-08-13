import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import type { ReportFilters, ReportRangeFilters } from '@/features/reports/common'
import { fetchSalaryReport, type SalaryReportData } from './salary-report-api'
import type { SalaryReportType } from '../constants'

/**
 * One of the five Salary Reports.
 *
 * The TYPE is in the key beside the filters and the page, not folded into them:
 * Pay Slip and Pay Register are different reads of the same month with different
 * columns, and neither may be shown under the other's heading while it loads.
 *
 * `keepPreviousData` holds the current page on screen while the next one is
 * fetched, so paging and re-sorting don't collapse the table to skeletons. That
 * is safe precisely because the type is in the key — the previous data it keeps
 * is always the same report, one page or one order back.
 *
 * Disabled until the screen's filters have been applied: nothing is read until
 * "Filter Data" is pressed, so `filters` is null before then.
 */
export function useSalaryReport(
  type: SalaryReportType,
  filters: ReportFilters | null,
  rangeFilters: ReportRangeFilters | null,
  params: PageParams,
) {
  const isRange = type === 'gross-salary'
  const enabled = isRange ? rangeFilters !== null : filters !== null

  return useQuery<SalaryReportData>({
    /* Spread rather than passed by reference: `ReportFilters` is an interface, and
       an interface has no implicit index signature to satisfy the key's
       `Record<string, unknown>`. */
    queryKey: queryKeys.reports.salary(type, { ...(isRange ? rangeFilters : filters) }, params),
    queryFn: () => fetchSalaryReport(type, filters!, rangeFilters!, params),
    enabled,
    placeholderData: keepPreviousData,
  })
}
