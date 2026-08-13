import { addYears, format, parse, startOfMonth } from 'date-fns'
import { amountLabel } from '@/lib/currency'

/**
 * Bonus Estimation — the two views, the four calculation bases, and the range the
 * screen reads for.
 *
 * Nothing here computes a bonus against a rule: the *percentage* is the payer's
 * decision and the statutory 8.33% is offered as a starting point, not enforced.
 * What the screen does compute is `base × percentage`, which is why the base is a
 * choice rather than a fixed column.
 */

/** The wire format the app's `<MonthPicker>` speaks — also the API's `from`/`to`. */
export const ISO_MONTH = 'yyyy-MM'

/** Which side of the screen is open. Two different endpoints, not two views. */
export type BonusView = 'estimate' | 'saved'

export const BONUS_VIEWS: { value: BonusView; label: string }[] = [
  { value: 'estimate', label: 'Estimate & Save' },
  { value: 'saved', label: 'Saved Bonus' },
]

/**
 * Which salary figure a bonus is figured on — the API's own `calculation_field`
 * enum, and a value outside it is a 400.
 *
 * All four are summed over the range on every estimate line, so switching this
 * re-fills the base column from the answer already on screen rather than firing
 * another read. `basic_pay_of_present_days` is the one most bonus calculations
 * actually want: the agreed basic prorated to the days the employee was present,
 * rather than the full month's basic regardless of attendance.
 */
export const CALCULATION_FIELDS = [
  'basic_pay',
  'basic_pay_of_present_days',
  'gross_pay',
  'net_pay',
] as const

export type CalculationField = (typeof CALCULATION_FIELDS)[number]

/** The dropdown, in the order a payroll clerk reaches for them. */
export const CALCULATION_FIELD_OPTIONS: { label: string; value: CalculationField }[] = [
  { label: 'Basic Pay', value: 'basic_pay' },
  { label: 'Basic Pay of Present Days', value: 'basic_pay_of_present_days' },
  { label: 'Gross Pay', value: 'gross_pay' },
  { label: 'Net Pay', value: 'net_pay' },
]

/** The base's own column heading, currency symbol included. */
export function calculationFieldLabel(field: CalculationField): string {
  return (
    CALCULATION_FIELD_OPTIONS.find((option) => option.value === field)?.label ?? 'Base'
  )
}

/** `Basic Pay (₹)` — what the estimate table's base column is headed. */
export function calculationFieldColumnLabel(field: CalculationField): string {
  return amountLabel(calculationFieldLabel(field))
}

/**
 * The statutory minimum bonus under the Payment of Bonus Act — 8.33% of the
 * base, i.e. one month's wage over a twelve-month year.
 *
 * Offered as the percentage field's placeholder and nothing more. The Act's
 * maximum is 20% and anything between is a management decision, so the screen
 * never fills this in on the user's behalf.
 */
export const STATUTORY_BONUS_PERCENT = 8.33

/** The API's own cap on `percentage`. */
export const MAX_BONUS_PERCENT = 100

/** The API's own cap on one employee's `amount`. */
export const MAX_BONUS_AMOUNT = 100_000_000

/** The largest selection one save may commit. */
export const MAX_BONUS_EMPLOYEES = 500

/** Month names, indexed by the API's own 1-based `month`. */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** A month number → its name, for headings and the month breakdown. */
export function bonusMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? ''
}

/** `June 2026` — how a saved month reads in the breakdown panel. */
export function bonusPeriodLabel(month: number, year: number): string {
  return `${bonusMonthName(month)} ${year}`
}

/**
 * How far back the range pickers reach. A bonus is declared for a financial year
 * that closed months ago and re-read years later, so this matches the reports'
 * own reach and stops at the month in progress — a future month has no processed
 * salary to figure a bonus on.
 */
export const BONUS_YEARS_BACK = 10

export function bonusMonthBounds(today: Date = new Date()): {
  minDate: Date
  maxDate: Date
} {
  const base = startOfMonth(today)
  return { minDate: addYears(base, -BONUS_YEARS_BACK), maxDate: base }
}

/** `{ month, year }` → the `yyyy-MM` string the pickers hold. */
export function toIsoMonth(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), ISO_MONTH)
}

/**
 * A `yyyy-MM` string back into a period. `null` for a cleared or unparseable
 * field — there is no "every month" read, so the screen keeps the last valid one.
 */
export function fromIsoMonth(value: string): { month: number; year: number } | null {
  if (!value) return null
  const parsed = parse(value, ISO_MONTH, new Date())
  if (Number.isNaN(parsed.getTime())) return null
  return { month: parsed.getMonth() + 1, year: parsed.getFullYear() }
}

/**
 * A `yyyy-MM` string as the first of that month — what a `<MonthPicker>` takes
 * for `minDate` / `maxDate`.
 *
 * This is how the range is kept valid: the To picker can't open earlier than the
 * From month, so `from` after `to` is unreachable rather than something the screen
 * has to refuse afterwards.
 */
export function isoMonthToDate(value: string): Date | null {
  const parsed = fromIsoMonth(value)
  return parsed ? new Date(parsed.year, parsed.month - 1, 1) : null
}

/** `yyyy-MM` printed the way a heading reads it — "July 2026". */
export function formatIsoMonth(value: string): string {
  const parsed = fromIsoMonth(value)
  return parsed ? bonusPeriodLabel(parsed.month, parsed.year) : value
}

/**
 * Rows per page. Both endpoints cap `limit` at 500 and neither can answer
 * "everything", so `<DataTable>`'s "All" (reported back as a negative limit) is
 * clamped to that by the list hooks.
 */
export const BONUS_PAGE_SIZE = 10
export const BONUS_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
export const BONUS_MAX_LIMIT = 500

/**
 * Sortable fields on these endpoints: **none**. Neither the estimate nor the
 * saved read takes a `sort`, so every column sets `enableSorting: false` — a
 * header click that only reordered the page in the browser would lie about the
 * other pages, and here it would also reorder rows carrying unsaved amounts.
 */
export const BONUS_SORT_FIELDS: readonly string[] = []
