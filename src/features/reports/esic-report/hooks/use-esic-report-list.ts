import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { formatAmount } from '@/lib/currency'
import {
  reportMonthName,
  useReportScreen,
  type ReportBasisItem,
} from '@/features/reports/common'
import { ESIC_REPORT_TYPES, type EsicReportType } from '../constants'
import { useEsicReport } from '../api/use-esic-report'

/**
 * The ESIC Report screen.
 *
 * Both types are read against the same header, so the strip above the table is
 * the same on either: the establishment's ESIC code, the wage ceiling and the
 * two contribution rates. The code is on it because a return is filed under
 * it — a sheet printed for the wrong establishment is not a small mistake.
 */
export function useEsicReportList() {
  const screen = useReportScreen<EsicReportType>(ESIC_REPORT_TYPES)

  const report = useEsicReport(
    screen.appliedType ?? 'esic-statement',
    screen.filters,
    screen.params,
  )

  const isForbidden = isForbiddenError(report.error)
  const data = report.data
  const header = data?.header ?? null

  const basisItems: ReportBasisItem[] = header
    ? [
        { label: 'ESIC code', value: header.esicCode || null },
        {
          label: 'Wage ceiling',
          value: header.wageCeilingLimit === null ? null : formatAmount(header.wageCeilingLimit),
        },
        {
          label: 'Employee',
          value: header.employeeContribution === null ? null : `${header.employeeContribution}%`,
        },
        {
          label: 'Employer',
          value: header.employerContribution === null ? null : `${header.employerContribution}%`,
        },
      ]
    : []

  return {
    ...screen,
    types: ESIC_REPORT_TYPES,

    data,
    header,
    basisItems,
    total: data?.total ?? 0,
    period: data?.period ?? null,
    appliedSubtitle: data ? `${reportMonthName(data.period.month)} ${data.period.year}` : '',

    isLoading: report.isLoading,
    isFetching: report.isFetching,
    isError: report.isError && !isForbidden,
    error: report.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(report.error) : undefined,
  }
}
