import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import {
  reportMonthName,
  useReportScreen,
  type ReportBasisItem,
} from '@/features/reports/common'
import { PT_REPORT_TYPES, type PtReportType } from '../constants'
import { usePtReport } from '../api/use-pt-report'

/**
 * The PT Report screen.
 *
 * The strip above the table is the establishment rather than a set of rates —
 * PT is a slab table, so there is no single rate to print. The EC and RC numbers
 * on it come from the selected department's branch and are absent until a
 * department is chosen, which is worth seeing before the statement is filed
 * against the wrong registration.
 */
export function usePtReportList() {
  const screen = useReportScreen<PtReportType>(PT_REPORT_TYPES)

  const report = usePtReport(screen.appliedType ?? 'pt-report', screen.filters, screen.params)

  const isForbidden = isForbiddenError(report.error)
  const data = report.data
  const header = data?.header ?? null

  const basisItems: ReportBasisItem[] = header
    ? [
        { label: 'Corporation', value: header.ptCorporationName || null },
        { label: 'EC number', value: header.ptEcNumber || null },
        { label: 'RC number', value: header.ptRcNumber || null },
      ]
    : []

  return {
    ...screen,
    types: PT_REPORT_TYPES,

    data,
    header,
    basisItems,
    rows: data?.items ?? [],
    total: data?.total ?? 0,
    period: data?.period ?? null,
    appliedSubtitle: data ? `${reportMonthName(data.period.month)} ${data.period.year}` : '',
    /* The strip has nothing to show until a department is picked — the EC and RC
       numbers hang off its branch. Say so rather than render an empty band. */
    hasEstablishment: basisItems.some((item) => item.value !== null),

    isLoading: report.isLoading,
    isFetching: report.isFetching,
    isError: report.isError && !isForbidden,
    error: report.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(report.error) : undefined,
  }
}
