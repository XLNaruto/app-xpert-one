import type { ReportPeriod } from '@/features/reports/common'

/**
 * The establishment the PT return is filed by. No rates — PT is a slab table,
 * so there is no single rate to print.
 */
export interface PtHeader {
  companyName: string
  departmentName: string
  /** Enrolment number — the employer's own PT liability. */
  ptEcNumber: string
  /** Registration number — the liability for tax deducted from employees. */
  ptRcNumber: string
  ptCorporationName: string
}

/** One PT-liable employee's month. */
export interface PtReportRow {
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  departmentName: string
  designationName: string
  /** The month's WHOLE gross — what PT is assessed on. */
  grossWages: number
  /**
   * The stored figure. Legitimately 0 for a gross below the state's first slab —
   * the employee still appears, because the act applies to their posting.
   */
  ptAmount: number
}

/** One page of the statement, with the establishment it is filed by. */
export interface PtReport {
  period: ReportPeriod
  header: PtHeader
  items: PtReportRow[]
  total: number
}
