/**
 * The processed month as the View Salary screen reads it.
 *
 * Where the Calculate Salary register hands over *inputs* and lets the client
 * price them, this is the other end: every figure here is what was actually
 * committed and stored against the salary. Nothing on this screen computes pay —
 * it reads it back.
 *
 * The one derived figure is `lwpDays` (working days minus present days), because
 * the API stores the two days but not the gap between them.
 */

/** The cycle the report was read for — printed, not derived from `month`. */
export interface SalaryViewPeriod {
  month: number
  year: number
  /** First day of the cycle, `yyyy-MM-dd`. */
  from: string
  /** Last day of the cycle, `yyyy-MM-dd`. */
  to: string
  cycleStartDay: number
  totalDaysInMonth: number
}

/** One allowance or deduction line stored against a salary. */
export interface SalaryViewHead {
  id: number
  payComponentId: number
  /** The head's full name — also the key the matrix columns pivot on. */
  name: string
  /** Short code, falling back to the name — what a narrow column prints. */
  code: string
  amount: number
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean
}

/** The statutory configuration the stored month was priced on. */
export interface SalaryViewActs {
  isPfActApplicable: boolean | null
  pfDeductionType: string | null
  pfDeductionAmount: number | null
  isEsicActApplicable: boolean | null
  esicDeductionBasis: string | null
  employeeEsicPercentage: number | null
  employerEsicPercentage: number | null
  isPtActApplicable: boolean | null
  ptActType: string | null
  isLwfActApplicable: boolean | null
  isTdsActApplicable: boolean | null
  tdsPercentage: number | null
  isOvertimeApplicable: boolean
  overtimeRatePerHour: number | null
}

/** One row of the report — a person's stored salary for the period. */
export interface SalaryViewRow {
  /** The stored salary's own id — what a discard sends. */
  salaryId: number
  employeeId: number
  /** The posting the salary was keyed on. */
  employeeServiceId: number
  month: number
  year: number

  /* ── Days and wages ── */
  basicPay: number
  wagesPerDay: number
  workingDays: number
  weeklyOff: string
  workingHour: number
  presentDays: number
  /** Basic pay for the days actually paid — the month's earned basic. */
  earnedBasic: number
  /** Derived: working days not paid for. Never below zero. */
  lwpDays: number
  extraDays: number
  extraDaysAmount: number
  otHours: number
  otAmount: number

  /* ── Money ── */
  allowances: SalaryViewHead[]
  deductions: SalaryViewHead[]
  /** Allowance amount by head NAME — how the matrix reads a row's cell. */
  allowanceByHead: Record<string, number>
  deductionByHead: Record<string, number>
  totalAllowance: number
  totalDeduction: number
  grossPay: number
  netPay: number
  employeePf: number
  employerPf: number
  employeeEsic: number
  employerEsic: number
  employeePt: number
  employeeLwf: number
  employeeTds: number

  /* ── Statutory configuration ── */
  acts: SalaryViewActs

  /* ── Payment ── */
  /** A paid salary is frozen — the API refuses to discard it. */
  isPaid: boolean
  paymentDate: string
  /** Whether the stored month came in from an import sheet. */
  isImported: boolean

  /* ── The person ── */
  employeeCode: string
  employeeName: string
  mobileNumber: string
  gender: string
  birthDate: string
  maritalStatus: string
  email: string
  relation: string
  relativeName: string
  joiningDate: string
  departmentId: number | null
  departmentName: string
  departmentCode: string
  designationId: number | null
  designationName: string

  /* ── Statutory numbers and bank ── */
  pfNumber: string
  uanNumber: string
  esicNumber: string
  aadharNumber: string
  bankName: string
  bankAccountNumber: string
  bankBranchName: string
  ifscCode: string
}

/** The footer of the rows returned — the page's own column sums. */
export interface SalaryViewTotals {
  grossPay: number
  netPay: number
  totalAllowance: number
  totalDeduction: number
  employeePf: number
  employeeEsic: number
  employeePt: number
  employeeLwf: number
  employeeTds: number
  employerPf: number
  employerEsic: number
}

/**
 * The whole read — the page of rows, the period, and the head columns to pivot
 * on.
 *
 * `allowanceHeads` / `deductionHeads` are the union of head names across the
 * result in catalog order, which is what makes the long view a stable matrix: a
 * row missing a head reads as zero rather than shifting the columns under it.
 */
export interface SalaryView {
  period: SalaryViewPeriod
  items: SalaryViewRow[]
  /** Stored salaries matching the filters, across every page. */
  total: number
  allowanceHeads: string[]
  deductionHeads: string[]
  totals: SalaryViewTotals
}
