import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import type { ReportFilters } from '@/features/reports/common'
import { fetchEsicReport, type EsicReportData } from './esic-report-api'
import type { EsicReportType } from '../constants'

/**
 * One of the two ESIC sheets. The type is in the key: the challan and the
 * statement print different column sets for the same month, and the challan's
 * missing contributions must never read as a statement that lost them.
 *
 * Disabled until "Filter Data" is pressed.
 */
export function useEsicReport(
  type: EsicReportType,
  filters: ReportFilters | null,
  params: PageParams,
) {
  return useQuery<EsicReportData>({
    queryKey: queryKeys.reports.esic(type, { ...filters }, params),
    queryFn: () => fetchEsicReport(type, filters!, params),
    enabled: filters !== null,
    placeholderData: keepPreviousData,
  })
}
