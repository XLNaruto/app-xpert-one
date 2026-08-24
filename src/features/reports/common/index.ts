/**
 * What the four report modules share.
 *
 * Salary, PF, ESIC and PT differ only in which endpoint they call and which
 * columns come back — everything that selects a report, stages it, pages it and
 * prints its cells is one implementation, exported from here. Feature folders
 * import through this file, never by deep path (CLAUDE.md rule #5).
 */

export { ReportFilterCard } from './components/report-filter-card'
export { ReportPreviewHeader } from './components/report-preview-header'
export { ReportBasisStrip, type ReportBasisItem } from './components/report-basis-strip'
export { ReportTable, type ReportTableProps } from './components/report-table'
export {
  CodeCell,
  Dash,
  DateCell,
  DaysCell,
  EmployeeCell,
  MoneyCell,
  PercentCell,
  TextCell,
} from './components/report-cells'
export { serialColumn } from './components/serial-column'
export { NUMERIC_CELL, PLAIN_CELL } from './components/report-cell-constants'

export { useReportScreen } from './hooks/use-report-screen'

export {
  formatIsoMonth,
  fromIsoMonth,
  REPORT_MAX_LIMIT,
  REPORT_MONTH_NAMES,
  REPORT_MONTH_OPTIONS,
  REPORT_PAGE_SIZE,
  REPORT_PAGE_SIZE_OPTIONS,
  reportMonthBounds,
  reportMonthName,
  reportYearOptions,
  toIsoMonth,
} from './constants'

export {
  esicHeaderSchema,
  paymentMetricsSchema,
  pfBasisSchema,
  ptHeaderSchema,
  reportPeriodSchema,
  reportRangeSchema,
  reportResponseSchema,
  type EsicHeaderResponse,
  type PaymentMetricsResponse,
  type PfBasisResponse,
  type PtHeaderResponse,
  type ReportPeriodResponse,
  type ReportRangeResponse,
} from './schemas'

export {
  num,
  text,
  toReportParams,
  toReportPeriod,
  toReportRange,
  toReportRangeParams,
} from './lib/report-mappers'

export type {
  ReportFilters,
  ReportPeriod,
  ReportRange,
  ReportRangeFilters,
  ReportTypeOption,
} from './types'
