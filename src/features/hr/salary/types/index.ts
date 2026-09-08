import type {
  AllowanceValueType,
  ComponentSchedule,
  TdsCalculationBase,
} from '@/features/master/designation'

/**
 * The salary register as the screen reads it — one designation's people against
 * one payroll month.
 *
 * **The client prices the row.** `GET /salary/register` no longer answers what a
 * pending row would be paid; it answers the four inputs — the attendance, the
 * wage structure in force, that structure's head configuration and the PF / ESIC
 * / PT / LWF rate masters — and `salary-calculations` does the arithmetic. Only
 * a *processed* row carries money of its own, in `salary` + `components`, and
 * that is the pay actually committed. `isProcessed` says which of the two a row
 * is, and `figures` is empty rather than a preview while it is pending.
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

/**
 * The wage structure in force for the row's designation.
 *
 * The whole act configuration, not a few flags for display: this is what the
 * statutory deductions are priced from — see `salary-statutory` — and what the
 * save echoes back as the settings the month was worked out on.
 */
export interface SalaryWageStructure {
  id: number
  /** `null` where the structure came off the EMPLOYEE, not off a designation. */
  designationId: number | null
  /** The month this version took effect, `yyyy-MM-dd`. */
  applicableDate: string | null
  /** `Monthly` or `Daily` — which of the two wage figures is the quoted one. */
  salaryType: string
  basicPay: number | null
  wagesPerDay: number | null
  workingDayCalculationType: string | null
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
  /** `Percentage` takes its rate from `pfDeductionAmount`, `Fixed` its rupees. */
  pfDeductionType: string | null
  pfDeductionAmount: number | null
  /** `Wage Ceiling`, `Gross Salary` or `As Per Act` — what ESIC is charged on. */
  esicDeductionBasis: string | null
  /** `As Per Act` follows the rate master's slabs; `Manual` uses `ptAmount`. */
  ptActType: string | null
  ptAmount: number | null
  /** `As Per Act` follows the rate master; `Manual` uses `lwfAmount`. */
  lwfActType: string | null
  lwfAmount: number | null
  tdsPercentage: number | null
  /**
   * What the TDS rate is charged on — one of five amounts, never the net.
   *
   * `null` deducts **nothing**, however high the percentage: a rate on its own
   * cannot say what it applies to, and contractor TDS under section 194C is 2% of
   * the total bill rather than of any wage figure. This is the default, and it
   * preserves the behaviour every structure had before TDS computed at all.
   */
  tdsCalculationBase: TdsCalculationBase | null
}

/**
 * How an ESIC contribution is rounded — a filing convention that changes by
 * notification, so it rides on the effective-dated rate row.
 *
 * `CEIL` is the old unconditional behaviour and remains the default. `PAISE` is
 * what a government-approved agency sheet states (₹104.23, not ₹105). The screen
 * must apply whichever the rate names: hard-coding one puts its ESIC away from
 * the server's and fails the save.
 */
export type EsicRoundingMode = 'CEIL' | 'ROUND' | 'PAISE'

/**
 * The statutory rate masters in force for the period, as the register hands them
 * over — the rates the screen prices PF, ESIC, PT and LWF from.
 *
 * Any of the four is `null` when the master has no rate covering the period. The
 * act then deducts nothing: falling back to a stale rate would price a month at
 * a percentage that was not in force for it.
 */
export interface SalaryRates {
  pf: {
    id: number
    effectiveDate: string | null
    /** The combined statutory rate, kept for display. */
    deduction: number | null
    /** EPF wages are capped here where the designation says to cap them. */
    wageCeilingLimit: number | null
    /** The employee's share, as a percentage. */
    employeeContribution: number | null
    employerContribution: number | null
  } | null
  esic: {
    id: number
    effectiveDate: string | null
    wageCeilingLimit: number | null
    employeeContribution: number | null
    employerContribution: number | null
    /** How both shares are rounded — `CEIL` unless the rate says otherwise. */
    roundingMode: EsicRoundingMode
  } | null
  pt: {
    id: number
    stateId: number | null
    effectiveDate: string | null
    slabs: SalaryPtSlab[]
  } | null
  lwf: {
    id: number
    stateId: number | null
    effectiveDate: string | null
    /** `'0'` is every month, otherwise `'01'`–`'12'`. */
    month: string
    employeeContribution: number | null
    employerContribution: number | null
  } | null
}

/** One band of the PT master — a flat amount for a salary range. */
export interface SalaryPtSlab {
  id: number
  minSalary: number | null
  /** `null` is open-ended — the "and above" band. */
  maxSalary: number | null
  /** `'0'` is every month, otherwise `'01'`–`'12'`. */
  month: string
  /** `Male`, `Female` or `Both`. */
  gender: string
  minAge: number | null
  amount: number
}

/**
 * One head as the structure the row was priced on configures it — the register's
 * own `salary_components`, which rides on the row beside the wage structure.
 *
 * This is the rule behind a head's amount, and so the thing a typed present-days
 * figure has to be re-read through: a `Percentage` head earns its share of the
 * earned basic and moves with the days, a `Fixed` one stays where it is.
 */
export interface SalaryComponent extends ComponentSchedule {
  payComponentId: number
  /** Short code, falling back to the name — the same label the columns use. */
  code: string
  name: string
  /** `ALLOWANCE` or `DEDUCTION`, as the pay-component master spells it. */
  componentType: 'ALLOWANCE' | 'DEDUCTION' | ''
  /** The master's own ordering, kept so a head lands where it belongs. */
  sortOrder: number
  /** `Percentage`, `Fixed`, `Per Day` or `Days` — see `headCellAmount`. */
  valueType: AllowanceValueType
  /** The percent, the monthly figure, the day rate or the day count. */
  value: number
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean
}

/** One allowance or deduction head against a row, at the amount it carries. */
export interface SalaryHead {
  payComponentId: number
  /** Column heading — the head's short code, its name when it has none. */
  code: string
  /** The full name, for the column's tooltip. */
  name: string
  amount: number
  /** Which acts the head counts towards — sent back on the save's breakdown. */
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean

  /*
   * How the schedule landed on THIS month — what makes a zero readable.
   *
   * A quarterly head off its payout month is `0` with `isPayoutMonth: false`,
   * which is "nothing due this month", not "an amount of nothing". An accrued
   * payout releasing six months at once is `accruedMonths: 6`, which is why the
   * figure is six times the configured one. `null` on a head read back from a
   * stored month that recorded no schedule.
   */
  isPayoutMonth: boolean | null
  accruedMonths: number | null
  /** 1–12 — when this head next pays out. `null` when nothing is scheduled. */
  nextPayoutMonth: number | null
  /** `EXCLUDE` keeps the head out of every base the others calculate on. */
  payrollCalculation: 'INCLUDE' | 'EXCLUDE'
}

/**
 * How one head is *configured* on the designation, which is what decides whether
 * its amount moves with the days.
 *
 * The register answers each head's amount and the rule behind it: this is
 * `salary_components` off the rows themselves, collapsed to one map for the page.
 * Nothing extra is fetched to find out what a head is.
 */
export interface SalaryHeadConfig extends ComponentSchedule {
  /**
   * Which of the four rules prices the head — a share of a base, a prorated
   * monthly figure, a rate per payable day, or a count of days at the day's wage.
   * `Per Day` and `Days` are **not** the same rule; see `headCellAmount`.
   */
  valueType: AllowanceValueType
  /** The percent, the monthly figure, the day rate or the day count. */
  value: number
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean
}

/** The designation's head configuration, by pay component id. */
export type SalaryHeadConfigs = Map<number, SalaryHeadConfig>

/**
 * A **stored** row's money — the pay a processed month was actually committed
 * at, read back off `salary` + `components`.
 *
 * A pending row has none of this. The register stopped answering a preview when
 * it started answering `rates` instead, so a pending row's figures are zeros
 * here and the real ones come from `rowFigures`, which prices the cells. Keeping
 * the block rather than making it nullable is what lets `rowFigures` fall back
 * to "as registered" for an untouched processed row without a second shape.
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

  /*
   * The invoice side, as a processed month recorded it. Populated only where the
   * SERVER engine priced the month — a sheet import, an employee payslip — and
   * `null` on a row saved through this screen's bulk save, which stores the lines
   * the screen computed and derives no bases.
   *
   * `null` is "not derived", not zero: render it as a dash.
   */
  totalStatutoryCost: number | null
  /** The agency's service charge on the statutory cost — a column on the bill. */
  agencyChargeAmount: number | null
  /** GST on the statutory cost plus that charge. */
  gstAmount: number | null
  totalInvoiceAmount: number | null
  agencyChargePercentage: number | null
  gstPercentage: number | null
  /** What the month's TDS was charged on, as stored. `null` deducted nothing. */
  tdsCalculationBase: string | null
}

/**
 * The company's billing rates — what the `TOTAL_INVOICE_AMOUNT` calculation base
 * is priced on.
 *
 * A company that has never configured charges invoices at statutory cost, which
 * is `null` here rather than a pair of zeros. **Nothing may assume 18% GST**: the
 * rate is the company's own, read off its `billing` block.
 */
export interface SalaryBilling {
  agencyChargePercentage: number
  gstPercentage: number
}

/**
 * The company's billing charges in force **for the period**, as the register's
 * own `billing_charge` block answers them.
 *
 * Read off the register rather than off the company record, because the charges
 * are effective-dated and a back-dated month is billed at the rates that were in
 * force for it — not at today's. `null` is a company that has configured none: it
 * invoices at statutory cost, which the arithmetic treats as 0% / 0%. **Nothing
 * may default GST to 18%.**
 */
export interface SalaryBillingCharge extends SalaryBilling {
  id: number
  effectiveDate: string | null
}

/**
 * The act settings stored against a processed month — the configuration its
 * statutory figures were worked out from, kept so a revision round-trips them
 * unchanged instead of re-deriving them from today's wage structure.
 */
export interface SalaryStoredActs {
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
  isOvertimeApplicable: boolean | null
  weeklyOff: string | null
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
  /**
   * How that structure configures each of the row's heads — the register's
   * `salary_components`. Empty when the posting has no structure in force, which
   * is the same case that leaves `wageStructure` null.
   */
  salaryComponents: SalaryComponent[]
  /**
   * Which tier the heads in `salaryComponents` came from. A separate question
   * from the wage's own tier — own basic pay with the designation's allowances is
   * a legitimate state — so it is read, never derived. `null` when nothing has
   * priced the row's heads.
   */
  salaryComponentSource: 'EMPLOYEE' | 'DESIGNATION' | null
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
  storedWorkingHour: number | null
  /**
   * The act settings a processed month was priced on. A revision echoes these
   * rather than the designation's current ones — the wage structure may have
   * been versioned since, and a back-dated month is owed at its own rates.
   * `null` while the row is pending, where the structure in force is the answer.
   */
  storedActs: SalaryStoredActs | null
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
  /** The PF / ESIC / PT / LWF masters the statutory deductions are priced from. */
  rates: SalaryRates
  /**
   * The agency charge and GST in force for the period — what the invoice chain,
   * and any TDS quoted on it, are priced from. `null` where the company has
   * configured none. Without this a PENDING row had no source for the two
   * percentages at all.
   */
  billingCharge: SalaryBillingCharge | null
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

/** One row of an import's report — the code the sheet carried, and what happened. */
export interface SalaryImportRow {
  employeeCode: string
  /** Why it was skipped or failed; empty on a saved row. */
  reason: string
  /** Only on a saved row. */
  salaryId?: number
}

/**
 * What `POST /user/salary/imports` reports back.
 *
 * `period` is the cycle the sheet was actually processed for, which is the
 * sheet's own period whenever it carries one — not necessarily the month the
 * register was showing when the file was picked.
 */
export interface SalaryImportResult {
  period: SalaryPeriod
  saved: SalaryImportRow[]
  /** Refused rows — already processed, unknown code, an ambiguous posting. */
  skipped: SalaryImportRow[]
  /** Rows the sheet itself got wrong — missing or unreadable values. */
  errors: SalaryImportRow[]
}

/** What `POST /user/salary/bulk-delete` reports back. */
export interface SalaryDeleteResult {
  deleted: number[]
  skipped: { salaryId: number; reason: string }[]
}
