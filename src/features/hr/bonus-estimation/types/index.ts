import type { CalculationField } from '../constants'

/**
 * UI-facing shapes for Bonus Estimation.
 *
 * The estimate side carries all four bases per employee, not just the one on
 * screen: the API answers them together so the CALCULATION BASE dropdown can
 * re-fill the column without another read, and they are the same sums the save
 * apportions against.
 */

/** The range a read answered for, as the API resolved it. */
export interface BonusRange {
  /** `yyyy-MM`, as the request sent it. */
  from: string
  to: string
  fromMonth: number
  fromYear: number
  toMonth: number
  toYear: number
}

/** One employee on the estimate, every base summed over the range. */
export interface BonusEstimateRow {
  employeeId: number
  employeeName: string
  employeeCode: string
  departmentName: string
  designationName: string
  /** How many processed months of the range this line sums. */
  monthsProcessed: number
  totalNetPay: number
  totalGrossPay: number
  totalBasicPay: number
  totalBasicPayOfPresentDays: number
  /**
   * The BONUS pay component ALREADY paid inside the range. Shown beside the base
   * and never subtracted: the estimate answers what the bonus costs, and whether
   * an advance offsets it is the payer's decision.
   */
  advanceBonus: number
}

export interface BonusEstimateList {
  range: BonusRange
  items: BonusEstimateRow[]
  /** Employees matching the filter across all pages — drives the pager. */
  total: number
}

/** One committed month under an employee's saved bonus. */
export interface SavedBonusMonth {
  bonusId: number
  /** The salary row the bonus hangs on. */
  salaryId: number
  month: number
  year: number
  designationId: number | null
  designationName: string
  /** Which figure this month's share was figured on. */
  calculationField: CalculationField
  /**
   * What that base held AT SAVE TIME — a snapshot, so reprocessing the month
   * afterwards doesn't rewrite a committed bonus. `null` when the save keyed the
   * amount by hand instead.
   */
  baseAmount: number | null
  percentage: number | null
  amount: number
  /** Read live off the salary row, unlike `baseAmount`. */
  wagesPerDay: number | null
  presentDays: number | null
  advanceBonus: number
}

/** One employee's committed bonus for the range — the months sum to `totalBonus`. */
export interface SavedBonusRow {
  employeeId: number
  employeeName: string
  employeeCode: string
  departmentName: string
  designationName: string
  totalBonus: number
  /** The BONUS component paid inside the range — beside the total, never netted off. */
  advanceBonus: number
  months: SavedBonusMonth[]
}

export interface SavedBonusList {
  range: BonusRange
  items: SavedBonusRow[]
  total: number
}

/**
 * What one employee's save came back with.
 *
 * `savedAmount` may be less than `requestedAmount`: a month already carrying a
 * bonus is skipped rather than overwritten, and its share is deliberately not
 * redistributed onto the remaining months — that would double-count against what
 * is already committed.
 */
export interface SaveBonusEmployeeResult {
  employeeId: number
  requestedAmount: number
  savedAmount: number
  /** Months actually written. */
  months: number
  skippedMonths: number
  /** Why nothing could be written for this employee, when nothing was. */
  reason: string | null
}

/**
 * What the save answered. A 201 is **not** "every ticked employee was
 * committed" — an employee with no processed months in the range, or one whose
 * months were already bonused, is reported here rather than failing the request.
 */
export interface SaveBonusResult {
  range: BonusRange
  calculationField: CalculationField
  /** Months written across the whole request. */
  saved: number
  skippedMonths: number
  employees: SaveBonusEmployeeResult[]
}

/**
 * A row's unsaved bonus, as the estimate table holds it while it is being keyed.
 *
 * Both halves are kept because both are sent: `percentage` is what produced the
 * figure and `amount` is the figure itself, which the API trusts and never
 * recomputes. They are held as the raw strings the inputs carry so a
 * half-typed `8.` isn't rewritten under the cursor.
 */
export interface BonusDraft {
  percentage: string
  amount: string
}
