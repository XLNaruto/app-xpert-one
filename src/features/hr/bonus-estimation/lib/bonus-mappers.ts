import { gridAmount } from '@/lib/currency'
import { MAX_BONUS_AMOUNT, MAX_BONUS_PERCENT, type CalculationField } from '../constants'
import type {
  BonusEstimateResponse,
  SaveBonusResponse,
  SavedBonusResponse,
} from '../schemas'
import type {
  BonusEstimateList,
  BonusEstimateRow,
  BonusRange,
  SaveBonusResult,
  SavedBonusList,
} from '../types'

/**
 * Wire → screen, plus the two sums the screen does itself. Pure: no React, no
 * hooks.
 *
 * A nullable name lands as `''` because a line that reached this screen belongs
 * to a processed salary — a missing department is a gap in the record, not an
 * unknown the cells each need a branch for. Amounts are never defaulted here:
 * the API answers all of them as plain numbers.
 */

const str = (value: string | null | undefined): string => value ?? ''

function toRange(raw: BonusEstimateResponse['range']): BonusRange {
  return {
    from: raw.from,
    to: raw.to,
    fromMonth: raw.from_month,
    fromYear: raw.from_year,
    toMonth: raw.to_month,
    toYear: raw.to_year,
  }
}

/** One page of the estimate. */
export function toBonusEstimateList(raw: BonusEstimateResponse): BonusEstimateList {
  return {
    range: toRange(raw.range),
    items: raw.items.map((item) => ({
      employeeId: item.employee_id,
      employeeName: str(item.employee_name),
      employeeCode: str(item.employee_code),
      departmentName: str(item.department_name),
      designationName: str(item.designation_name),
      monthsProcessed: item.months_processed,
      totalNetPay: item.total_net_pay,
      totalGrossPay: item.total_gross_pay,
      totalBasicPay: item.total_basic_pay,
      totalBasicPayOfPresentDays: item.total_basic_pay_of_present_days,
      advanceBonus: item.advance_bonus,
    })),
    total: raw.total,
  }
}

/** One page of the committed bonuses, each employee's months whole. */
export function toSavedBonusList(raw: SavedBonusResponse): SavedBonusList {
  return {
    range: toRange(raw.range),
    items: raw.items.map((item) => ({
      employeeId: item.employee_id,
      employeeName: str(item.employee_name),
      employeeCode: str(item.employee_code),
      departmentName: str(item.department_name),
      designationName: str(item.designation_name),
      totalBonus: item.total_bonus,
      advanceBonus: item.advance_bonus,
      months: item.months.map((month) => ({
        bonusId: month.bonus_id,
        salaryId: month.salary_id,
        month: month.month,
        year: month.year,
        designationId: month.designation_id,
        designationName: str(month.designation_name),
        calculationField: month.calculation_field,
        baseAmount: month.base_amount,
        percentage: month.percentage,
        amount: month.amount,
        wagesPerDay: month.wages_per_day,
        presentDays: month.present_days,
        advanceBonus: month.advance_bonus,
      })),
    })),
    total: raw.total,
  }
}

/** What the save answered, refusals included. */
export function toSaveBonusResult(raw: SaveBonusResponse): SaveBonusResult {
  return {
    range: toRange(raw.range),
    calculationField: raw.calculation_field,
    saved: raw.saved,
    skippedMonths: raw.skipped_months,
    employees: raw.employees.map((item) => ({
      employeeId: item.employee_id,
      requestedAmount: item.requested_amount,
      savedAmount: item.saved_amount,
      months: item.months,
      skippedMonths: item.skipped_months,
      reason: item.reason,
    })),
  }
}

/* ── The screen's own arithmetic ────────────────────────────────────────────── */

/**
 * The base this row is being figured on. All four are on the line, so switching
 * the CALCULATION BASE dropdown is a re-read of the same answer.
 */
export function baseAmountFor(
  row: BonusEstimateRow,
  field: CalculationField,
): number {
  switch (field) {
    case 'net_pay':
      return row.totalNetPay
    case 'gross_pay':
      return row.totalGrossPay
    case 'basic_pay':
      return row.totalBasicPay
    case 'basic_pay_of_present_days':
      return row.totalBasicPayOfPresentDays
  }
}

/**
 * `base × percentage`, to two decimals — the amount a percentage auto-fills.
 *
 * Two decimals because that is what the API accepts back, and because the server
 * apportions the amount across the months in whole paise: a figure with more
 * precision than that would be rounded on the way in and the stored rows would
 * no longer sum to what was authorised on screen.
 */
export function bonusAmountFrom(base: number, percentage: number): number {
  return gridAmount((base * percentage) / 100)
}

/**
 * The percentage an amount works out to against the base — what a hand-keyed
 * amount is stored as having been figured on.
 *
 * `null` when there is no usable base, which is exactly the case the manual entry
 * exists for: with nothing to divide by there is no percentage to claim, and
 * sending a made-up one would misdescribe how the figure was reached.
 */
export function bonusPercentFrom(base: number, amount: number): number | null {
  if (base <= 0) return null
  return gridAmount((amount / base) * 100)
}

/**
 * A keyed field as a number, or `null` when it isn't one yet — an empty box, a
 * lone minus sign, a half-typed `8.`.
 *
 * The table holds what was typed rather than a parsed number, so that a value
 * mid-entry is never rewritten under the cursor; this is where it becomes a
 * figure, at the two points that need one (filling the other column, and saving).
 */
export function parseNumeric(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * What a percentage box is allowed to hold, as it is typed.
 *
 * A keystroke that would take the figure past 100 lands ON 100 rather than being
 * kept and refused later: the API caps `percentage` there, and a box reading
 * `10000` is a typo the screen should stop rather than store. Anything that isn't
 * a number yet — an empty box, a half-typed `8.` — is left exactly as typed so
 * nothing is rewritten under the cursor.
 */
export function clampPercentText(value: string): string {
  const parsed = parseNumeric(value)
  if (parsed === null) return value
  if (parsed > MAX_BONUS_PERCENT) return String(MAX_BONUS_PERCENT)
  if (parsed < 0) return '0'
  return value
}

/** The same for an amount, against the API's own ten-crore ceiling. */
export function clampAmountText(value: string): string {
  const parsed = parseNumeric(value)
  if (parsed === null) return value
  if (parsed > MAX_BONUS_AMOUNT) return String(MAX_BONUS_AMOUNT)
  if (parsed < 0) return '0'
  return value
}

/** A percentage inside the API's 0–100, or `null`. */
export function parsePercent(value: string): number | null {
  const parsed = parseNumeric(value)
  if (parsed === null || parsed < 0 || parsed > MAX_BONUS_PERCENT) return null
  return parsed
}

/** An amount inside the API's own bounds, or `null`. */
export function parseAmount(value: string): number | null {
  const parsed = parseNumeric(value)
  if (parsed === null || parsed < 0 || parsed > MAX_BONUS_AMOUNT) return null
  return gridAmount(parsed)
}
