import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { formatIsoMonth, reportMonthName, useReportScreen } from '@/features/reports/common'
import { SALARY_REPORT_TYPES, type SalaryReportType } from '../constants'
import { useSalaryReport } from '../api/use-salary-report'

/**
 * The Salary Report screen: the shared filter machinery, pointed at whichever of
 * the five types is applied.
 *
 * The type handed to the query is the APPLIED one, never the draft in the
 * dropdown — changing the dropdown must not re-read the report under the old
 * heading, and it must not send the old type's `sort` to the new endpoint (each
 * accepts only its own columns, and anything else is a 400).
 *
 * Before the first "Filter Data" there are no filters at all, so the query is
 * disabled and the screen shows what it is waiting for rather than an empty
 * table that looks like an answer.
 */
export function useSalaryReportList() {
  const screen = useReportScreen<SalaryReportType>(SALARY_REPORT_TYPES)

  const report = useSalaryReport(
    /* Only ever read while `filters` is non-null, which needs an applied type —
       the fallback just satisfies the signature before the first apply. */
    screen.appliedType ?? 'pay-slip',
    screen.filters,
    screen.rangeFilters,
    screen.params,
  )

  const isForbidden = isForbiddenError(report.error)

  /** The period the preview heading prints — a range for Gross Salary. */
  const appliedSubtitle = screen.appliedTypeConfig.isRange
    ? report.data?.type === 'gross-salary'
      ? `${formatIsoMonth(report.data.range.from)} — ${formatIsoMonth(report.data.range.to)}`
      : ''
    : report.data && report.data.type !== 'gross-salary'
      ? `${reportMonthName(report.data.period.month)} ${report.data.period.year}`
      : ''

  return {
    ...screen,
    types: SALARY_REPORT_TYPES,

    data: report.data,
    total: report.data?.total ?? 0,
    /* The cycle, where the type sends one — Gross Salary spans periods and has
       no single cycle to print. */
    period: report.data && report.data.type !== 'gross-salary' ? report.data.period : null,
    appliedSubtitle,

    isLoading: report.isLoading,
    isFetching: report.isFetching,
    isError: report.isError && !isForbidden,
    error: report.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(report.error) : undefined,
  }
}
