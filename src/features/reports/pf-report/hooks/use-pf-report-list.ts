import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { formatAmount } from '@/lib/currency'
import {
  reportMonthName,
  useReportScreen,
  type ReportBasisItem,
} from '@/features/reports/common'
import { PF_REPORT_TYPES, type PfReportType } from '../constants'
import { usePfReport } from '../api/use-pf-report'

/**
 * The PF Report screen: the shared filter machinery pointed at whichever of the
 * four sheets is applied, plus the `basis` strip they all print.
 *
 * The strip is built here rather than in the page because it is a reading of the
 * response, not layout: which of the rates matter depends on the sheet. The
 * challan and the statement are reconciled against the PF ceiling and the two
 * contribution rates; the ECR adds EDLI's own ceiling, which the act allows to
 * sit below the PF one; the registration sheet has no money on it at all and so
 * needs no rates — only the warning, if the establishment has no rate on file.
 */
export function usePfReportList() {
  const screen = useReportScreen<PfReportType>(PF_REPORT_TYPES)

  const report = usePfReport(screen.appliedType ?? 'pf-challan', screen.filters, screen.params)

  const isForbidden = isForbiddenError(report.error)
  const data = report.data
  const basis = data?.basis ?? null

  const percent = (value: number | null) => (value === null ? null : `${value}%`)
  const rupees = (value: number | null) => (value === null ? null : formatAmount(value))

  const basisItems: ReportBasisItem[] =
    !basis || data?.type === 'new-joining'
      ? []
      : [
          { label: 'Wage ceiling', value: rupees(basis.wageCeilingLimit) },
          ...(data?.type === 'ecr'
            ? [{ label: 'EDLI ceiling', value: rupees(basis.edliWageCeilingLimit) }]
            : []),
          { label: 'Employee PF', value: percent(basis.employeePfPercentage) },
          { label: 'Employer PF', value: percent(basis.employerPfContribution) },
          { label: 'Pension rate', value: percent(basis.pensionRate) },
          {
            label: 'Pension age limit',
            value: basis.pensionFundAgeLimit === null ? null : String(basis.pensionFundAgeLimit),
          },
        ]

  return {
    ...screen,
    types: PF_REPORT_TYPES,

    data,
    basis,
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
