import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import type { ReportFilters } from '@/features/reports/common'
import { fetchPtReport } from './pt-report-api'
import type { PtReportType } from '../constants'

/**
 * The Professional Tax statement. The type is still in the key — PT has one
 * today, and a second would otherwise share this one's cache entry.
 *
 * Disabled until "Filter Data" is pressed.
 */
export function usePtReport(
  type: PtReportType,
  filters: ReportFilters | null,
  params: PageParams,
) {
  return useQuery({
    queryKey: queryKeys.reports.pt(type, { ...filters }, params),
    queryFn: () => fetchPtReport(filters!, params),
    enabled: filters !== null,
    placeholderData: keepPreviousData,
  })
}
