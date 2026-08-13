import type { ReportPeriod, ReportRange } from '@/features/reports/common'

/**
 * The five Salary Report reads, as the screen renders them.
 *
 * Nothing here is computed. Every figure is the one the register stored against
 * the salary — `present_days` and `working_days` are the counts the month was
 * PRICED with, not a live re-count of attendance, which would drift from the
 * payslip the moment a punch was corrected.
 */

/** Pay Slip — the days the month was paid on and the four money columns. */
export interface PaySlipRow {
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  designationName: string
  departmentName: string
  presentDays: number
  workingDays: number
  basicPay: number
  grossPay: number
  /** The month's WHOLE deduction, so gross less this is always the net. */
  deductions: number
  netPay: number
}

/** Pay Register — one employee's whole month, in the register's fixed columns. */
export interface PayRegisterRow {
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  departmentName: string
  gender: string
  birthDate: string
  maritalStatus: string
  primaryMobile: string
  joiningDate: string
  aadharNumber: string
  uanNumber: string
  esicNumber: string
  bankName: string
  bankAccountNumber: string
  ifscCode: string
  bankBranchName: string
  relativeType: string
  relativeName: string
  email: string
  /** The WORK location — the branch the posting sits under, not a home address. */
  location: string
  presentDays: number
  workingDays: number
  basicPay: number
  grossPay: number
  /** The EMPLOYEE's half. The employer's contribution is a company cost, not a deduction. */
  pfAmount: number
  esicAmount: number
  ptAmount: number
  totalDeduction: number
  netPay: number
}

/** Gross Salary — one line per EMPLOYEE across the whole range. */
export interface GrossSalaryRow {
  employeeId: number
  employeeName: string
  employeeCode: string
  /** From the employee's LATEST period inside the range. */
  departmentName: string
  designationName: string
  totalGrossPay: number
  primaryMobile: string
  aadharNumber: string
  joiningDate: string
  /** How many months of the range this one line covers. */
  monthsProcessed: number
}

/** Paid Salary — what went out, and when. */
export interface PaidSalaryRow {
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  primaryMobile: string
  netPay: number
  paymentDate: string
}

/** Unpaid Salary — what is still owed for the period. */
export interface UnpaidSalaryRow {
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  primaryMobile: string
  grossPay: number
  netPay: number
  isPaid: boolean
}

/** The two tiles the payment reports carry, over the WHOLE filter. */
export interface PaymentMetrics {
  totalEmployees: number
  totalNetPay: number
}

/** `{ period, items, total }` as the screen holds it. */
export interface SalaryReportPage<TRow> {
  period: ReportPeriod
  items: TRow[]
  total: number
}

/** The same for the one type read over a range. */
export interface GrossSalaryReport {
  range: ReportRange
  items: GrossSalaryRow[]
  total: number
}

/** A payment report — its page, plus the tiles that describe the whole filter. */
export interface PaymentReport<TRow> extends SalaryReportPage<TRow> {
  metrics: PaymentMetrics
}
