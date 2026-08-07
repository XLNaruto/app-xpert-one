/**
 * The salary register as the screen reads it — one designation's people against
 * one payroll month.
 *
 * The API answers two versions of the same figures: `computed`, the pay that
 * *would* be saved if the row were committed as it stands, and `salary` +
 * `components`, the pay that *was* saved once the month is processed. A screen
 * that had to choose between them per cell would say "stored ?? computed" forty
 * times, so the mapper chooses once and hands the grid a single `figures` block.
 * `isProcessed` says which of the two it came from.
 */

/**
 * The cycle the register was read for — not the calendar month whenever a cycle
 * start day is set, which is why it's printed rather than derived from `month`.
 */
export interface SalaryPeriod {
  month: number
  year: number
  /** First day of the cycle, `yyyy-MM-dd`. */
  from: string
  /** Last day of the cycle, `yyyy-MM-dd`. */
  to: string
  cycleStartDay: number
  totalDaysInMonth: number
}

/**
 * The company's month at a glance. Always the whole company, whatever the
 * register is filtered to — so it reads as progress through the payroll rather
 * than as a count of what's on screen.
 */
export interface SalaryTotals {
  totalEmployees: number
  salaryDone: number
  salaryPending: number
}

/** The attendance the month would be paid on. */
export interface SalaryAttendance {
  presentDays: number
  fullDays: number
  holidayDays: number
  paidLeaveDays: number
  /** Reported to explain a short month — leave without pay, and not paid. */
  unpaidLeaveDays: number
  weeklyOffDays: number
  /** What pay is computed on: days punched + holidays + approved paid leave. */
  payableDays: number
  workingDays: number
}

/** The wage structure in force for the row's designation — the parts shown. */
export interface SalaryWageStructure {
  id: number
  designationId: number
  /** `Monthly` or `Daily` — which of the two wage figures is the quoted one. */
  salaryType: string
  basicPay: number | null
  wagesPerDay: number | null
  workingDays: number | null
  weeklyOff: string | null
  extraDayAmountPerDay: number | null
  isOvertimeApplicable: boolean
  overtimeRatePerHour: number | null
  isPfActApplicable: boolean
  isEsicActApplicable: boolean
  isPtActApplicable: boolean
  isLwfActApplicable: boolean
  isTdsActApplicable: boolean
}

/** One allowance or deduction head against a row, at the amount it carries. */
export interface SalaryHead {
  payComponentId: number
  /** Column heading — the head's short code, its name when it has none. */
  code: string
  /** The full name, for the column's tooltip. */
  name: string
  amount: number
}

/**
 * A row's money, from whichever side of the register it came from. Every figure
 * is the server's: the screen sends days, never amounts, so nothing here is
 * arrived at on the client except the two previews in `salary-calculations`.
 */
export interface SalaryFigures {
  basicPay: number
  wagesPerDay: number
  /** Basic pay for the days actually paid — the month's earned basic. */
  earnedBasic: number
  allowances: SalaryHead[]
  deductions: SalaryHead[]
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
  extraDays: number
  extraDaysAmount: number
  otHours: number
  /** Hourly overtime rate from the wage structure — `0` when OT doesn't apply. */
  otRate: number
  otAmount: number
}

/** One row of the register: a person's posting, and the month against it. */
export interface SalaryRegisterRow {
  employeeId: number
  /** The posting — what a save is keyed on, not the employee. */
  employeeServiceId: number
  employeeCode: string
  employeeName: string
  employeePrefix: string
  photo: string
  designationId: number | null
  designationName: string
  departmentId: number | null
  departmentName: string
  joiningDate: string
  leavingDate: string
  /** The posting's status, e.g. `ACTIVE`. */
  status: string
  attendance: SalaryAttendance
  /** `null` on a posting whose designation has no wage structure in force. */
  wageStructure: SalaryWageStructure | null
  /** Stored figures when the month is processed, the preview otherwise. */
  figures: SalaryFigures
  /**
   * The days a processed month was actually saved on — what a revision opens on,
   * and `null` while the month is still pending. Kept beside `figures` because
   * these two are the row's *inputs* rather than its money: they're what the
   * screen sends back, so a stored value has to survive round-tripping exactly.
   */
  storedPresentDays: number | null
  storedWorkingDays: number | null
  /** Whether the month has already been saved for this posting. */
  isProcessed: boolean
  /** The stored salary's own id — what a discard sends. `null` when pending. */
  salaryId: number | null
  /**
   * A paid month is frozen: the API refuses both a re-save and a discard, so the
   * row is shown read-only rather than offered and then rejected.
   */
  isPaid: boolean
  paymentDate: string
  /** Whether the stored month came in from an import sheet rather than here. */
  isImported: boolean
}

/** The whole register read — the page of rows, and the month it describes. */
export interface SalaryRegister {
  period: SalaryPeriod
  totals: SalaryTotals
  items: SalaryRegisterRow[]
  /** Rows on the side being shown (`pending` or `complete`), across all pages. */
  total: number
}

/** What `POST /user/salary/bulk-save` reports back, row by row. */
export interface SalarySaveResult {
  saved: { employeeServiceId: number; salaryId: number; action: string }[]
  /** Refused rows — a paid month, or a posting with no wage structure. */
  skipped: { employeeServiceId: number; reason: string }[]
}

/** What `POST /user/salary/bulk-delete` reports back. */
export interface SalaryDeleteResult {
  deleted: number[]
  skipped: { salaryId: number; reason: string }[]
}
