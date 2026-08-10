import { addYears, format, parse, startOfMonth } from 'date-fns'

/** The wire format the app's `<MonthPicker>` speaks. */
export const ISO_MONTH = 'yyyy-MM'

/** The two ways the same month is read. */
export type SalaryViewMode = 'short' | 'long'

/**
 * Short view is the register as a list — one line per person, ending at the net
 * pay. Long view is the same rows opened out into the matrix: every allowance
 * and deduction head as its own column.
 */
export const SALARY_VIEW_MODES: { value: SalaryViewMode; label: string }[] = [
  { value: 'short', label: 'Short View' },
  { value: 'long', label: 'Long View' },
]

/** Month names, indexed by the API's own 1-based `month`. */
export const SALARY_VIEW_MONTH_NAMES: string[] = [
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

/** A month number → its name, for headings and the detail screen's subtitle. */
export function salaryMonthName(month: number): string {
  return SALARY_VIEW_MONTH_NAMES[month - 1] ?? ''
}

/**
 * How far back the month picker reaches. Payroll is re-read years after it was
 * run — a PF query, an audit — so this goes back further than the register's own
 * picker does, and stops at the month in progress: a future month has no
 * attendance to have been processed from.
 */
export const SALARY_VIEW_YEARS_BACK = 10

export function salaryViewMonthBounds(today: Date = new Date()): {
  minDate: Date
  maxDate: Date
} {
  const base = startOfMonth(today)
  return { minDate: addYears(base, -SALARY_VIEW_YEARS_BACK), maxDate: base }
}

/** `{ month, year }` → the `yyyy-MM` string the picker holds. */
export function toIsoMonth(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), ISO_MONTH)
}

/**
 * A `yyyy-MM` string back into the pair the report is filtered by. Returns
 * `null` for a cleared or unparseable field, which the screen ignores — there is
 * no "every month" read, so the last valid period stays on screen.
 */
export function fromIsoMonth(value: string): { month: number; year: number } | null {
  if (!value) return null
  const parsed = parse(value, ISO_MONTH, new Date())
  if (Number.isNaN(parsed.getTime())) return null
  return { month: parsed.getMonth() + 1, year: parsed.getFullYear() }
}

/**
 * Rows per page. Five matches the app's default list density, and the long
 * view's matrix is wide enough that a taller page would scroll in both
 * directions at once.
 *
 * `GET /user/salary/report` caps `limit` at 500, so there is no "All" — the
 * endpoint has no way to answer one.
 */
export const SALARY_VIEW_PAGE_SIZE = 5
export const SALARY_VIEW_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100]

/**
 * The largest page the endpoint will answer. `<DataTable>`'s size selector always
 * offers "All", which it reports back as a negative limit — the report has no
 * way to answer that, so the list hook clamps it to this instead of sending a
 * request the API refuses.
 */
export const SALARY_VIEW_MAX_LIMIT = 500
