import type { AuditFields } from '@/types/audit'
import type {
  ComponentSchedule,
  TdsCalculationBase,
} from '../lib/component-schedule'

/** How the paid working days for the month are arrived at. */
export type WorkingDayCalculationType = 'Fixed' | 'As Per Calculation'

/** Whether a statutory amount follows the act's slab or is entered by hand. */
export type ActAmountType = 'As Per Act' | 'Manual'

/** Whether the PF share is a flat amount or a share of the EPF wages. */
export type PfDeductionType = 'Fixed' | 'Percentage'

/**
 * How a head's configured figure is read.
 *
 * Four rules, and the last two are **not** the same one:
 *
 * - `Percentage` — a share of the base the head names.
 * - `Fixed` — a MONTHLY rupee figure, prorated by attendance.
 * - `Per Day` — a rupee RATE per day, paid on the payable days as they stand.
 *   Not prorated again: the day count already carries the attendance, so 29
 *   payable days against a 26-day month pay all 29.
 * - `Days` — a COUNT of days at the day's wage, and it IS prorated, because it
 *   is an entitlement for a whole month ("4 days of leave encashment") that a
 *   25-of-26-day month accrues 25/26 of.
 *
 * See `salary-calculations` for the arithmetic each one comes to.
 */
export type AllowanceValueType = 'Percentage' | 'Fixed' | 'Per Day' | 'Days'

/**
 * One head configured on a designation — an allowance or a deduction. Both sides
 * take the same shape: the API carries them in one `salary_components` array, and
 * a head's own `type` in the pay-component master decides which side it's on.
 */
export interface DesignationSalaryComponent extends ComponentSchedule {
  /** Id of the head's record in the allowance / deduction master. */
  componentId: number
  valueType: AllowanceValueType
  /** The percent, the rupee figure, the day rate or the day count — per `valueType`. */
  amount: number | null
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean
}

/**
 * A designation master record as consumed by the UI. Designations are held at
 * company level — they are not tied to a department.
 *
 * The API splits the record in two: the title, and an effective-dated wage
 * structure behind it. This shape is the title flattened together with the
 * version **in force**, which is what the detail read answers. A list row
 * carries the title alone, so every pay field on it reads `null` — the list
 * screen shows no pay for that reason.
 */
export interface Designation extends AuditFields {
  id: number
  /** The tenant the record belongs to — the company the session has active. */
  companyId: number

  // Designation detail
  designationName: string

  /**
   * Id of the wage structure version the pay fields below came from — the one in
   * force. `null` on a list row, and on a designation never configured.
   */
  wageStructureId: number | null

  // Salary configuration
  salaryType: string | null
  basicPay: number | null
  workingDayCalculationType: WorkingDayCalculationType | null
  /** Set only when `workingDayCalculationType` is "Fixed". */
  workingDays: number | null
  /** Set only when `workingDayCalculationType` is "As Per Calculation". */
  weeklyOff: string | null
  extraDayAmountPerDay: number | null

  // PF act
  pfActApplicable: boolean
  pfDeductionType: PfDeductionType | null
  /** Set only when `pfDeductionType` is "Percentage". */
  pfDeductionPercentage: number | null
  /** Set only when `pfDeductionType` is "Fixed". */
  pfDeductionAmount: number | null
  employeePfContributionOnWageLimit: boolean
  employerPfContributionOnWageLimit: boolean

  // ESIC act
  esicActApplicable: boolean
  esicDeductionBasis: string | null

  // Professional tax act
  ptActApplicable: boolean
  ptActType: ActAmountType | null
  ptAmount: number | null

  // TDS act
  tdsActApplicable: boolean
  /** The rate deducted, set only when the TDS act applies. */
  tdsPercentage: number | null
  /**
   * What that rate is charged on — one of five amounts, never the net.
   *
   * `null` deducts **nothing**: a percentage on its own cannot say what it
   * applies to, and contractor TDS under section 194C is 2% of the total bill
   * rather than of any wage figure.
   */
  tdsCalculationBase: TdsCalculationBase | null

  // Labour welfare fund act
  lwfActApplicable: boolean
  lwfActType: ActAmountType | null
  lwfAmount: number | null

  // Overtime
  overtimeApplicable: boolean
  /** The stored rate for an overtime hour — the API keeps the figure, not how it was arrived at. */
  overtimeRatePerHour: number | null

  // Allowance / deduction heads
  allowances: DesignationSalaryComponent[]
  deductions: DesignationSalaryComponent[]
}

/* ── Wage structure history ─────────────────────────────────────────────── */

/** Whether the wage is quoted per day or per month. */
export type WageSalaryType = 'Daily' | 'Monthly'

/** What the ESIC contribution is worked out on — the API's own three answers. */
export type WageEsicDeductionBasis = 'Wage Ceiling' | 'Gross Salary' | 'As Per Act'

/**
 * One allowance head as valued in a wage structure row.
 *
 * The payout schedule rides on it via `ComponentSchedule`, in the same string
 * shape the form rows hold — `startMonth` included — so a stored version maps
 * onto an editable row by spreading rather than by converting field by field.
 * `calculationBase` is carried but meaningless on this side: the API refuses one
 * on an allowance, and the mapper drops it.
 */
export interface WageAllowance extends ComponentSchedule {
  /** Id of the head's record in the allowance / deduction master. */
  componentId: number
  valueType: AllowanceValueType
  /** The percent, the rupee figure, the day rate or the day count — per `valueType`. */
  amount: number | null
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean
}

/** One deduction head as valued in a wage structure row. */
export interface WageDeduction extends ComponentSchedule {
  /** Id of the head's record in the allowance / deduction master. */
  componentId: number
  valueType: AllowanceValueType
  amount: number | null
}

/**
 * One effective-dated wage structure for a designation. History is append-only:
 * a row applies from its effective month onward until a later row supersedes it,
 * so existing rows are never edited — a change means a new row.
 */
export interface DesignationWageStructure extends AuditFields {
  id: number
  designationId: number
  /**
   * Whether this version carries a head list of its **own**.
   *
   * Only meaningful on an EMPLOYEE's wage version, where the head list is an
   * override: a version with heads prices the person on those, and one with none
   * falls back to the designation's catalog. A designation's own version is the
   * catalog, so the field is left `undefined` there and the grid shows no such
   * column.
   */
  ownHeads?: boolean
  /**
   * Month the structure takes effect from, as `yyyy-MM` — the month half of the
   * API's `applicable_date`.
   */
  effectiveFrom: string

  // Working days & salary
  workingDayCalculationType: WorkingDayCalculationType | null
  /** `null` reads as "no weekly off". */
  weeklyOff: string | null
  /** Set only when `workingDayCalculationType` is "Fixed". */
  workingDays: number | null
  salaryType: WageSalaryType
  /** Captured for a monthly wage, derived from the daily wage otherwise. */
  basicPay: number | null
  /** Captured for a daily wage, derived from the monthly basic otherwise. */
  wagePerDay: number | null
  extraDayAmountPerDay: number | null

  allowances: WageAllowance[]
  deductions: WageDeduction[]

  // Overtime
  overtimeApplicable: boolean
  /** The rate for an overtime hour, as stored — entered on the row or derived from its wage. */
  overtimeRatePerHour: number | null

  // PF act
  pfActApplicable: boolean
  employeePfContributionOnWageLimit: boolean
  employerPfContributionOnWageLimit: boolean
  pfValueType: PfDeductionType
  pfValue: number | null

  // ESIC act
  esicActApplicable: boolean
  esicDeductionBasis: WageEsicDeductionBasis | null

  // Professional tax act
  ptActApplicable: boolean
  ptActType: ActAmountType | null
  /** Set only when `ptActType` is "Manual". */
  ptAmount: number | null

  // TDS act
  tdsActApplicable: boolean
  /** The rate deducted — set only when the TDS act applies. */
  tdsPercentage: number | null
  /** What the rate is charged on. `null` deducts nothing — see `Designation`. */
  tdsCalculationBase: TdsCalculationBase | null

  // Labour welfare fund act
  lwfActApplicable: boolean
  lwfActType: ActAmountType | null
  /** Set only when `lwfActType` is "Manual". */
  lwfAmount: number | null
}
