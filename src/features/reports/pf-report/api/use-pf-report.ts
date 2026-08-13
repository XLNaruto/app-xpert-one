import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import type { ReportFilters } from '@/features/reports/common'
import { fetchPfReport, type PfReportData } from './pf-report-api'
import type { PfReportType } from '../constants'

/**
 * One of the four PF sheets.
 *
 * The type sits in the key beside the filters and the page: the challan and the
 * statement report different wages for the same employee in the same month —
 * deliberately, since one is read against the days worked and the other against
 * the agreed wage — so neither may ever be shown under the other's heading.
 *
 * Disabled until "Filter Data" is pressed, which is when `filters` stops being
 * null.
 */
export function usePfReport(
  type: PfReportType,
  filters: ReportFilters | null,
  params: PageParams,
) {
  return useQuery<PfReportData>({
    queryKey: queryKeys.reports.pf(type, { ...filters }, params),
    queryFn: () => fetchPfReport(type, filters!, params),
    enabled: filters !== null,
    placeholderData: keepPreviousData,
  })
}
