import { addYears, format, parse, startOfMonth } from 'date-fns'
import type { ComboboxOption } from '@/components/ui/combobox'

/**
 * What every report screen shares: the period pickers, the page sizes, and the
 * month names the headings print.
 *
 * A report is always read for ONE period (or, for Gross Salary, one range of
 * them) — there is no "every month" read, because a salary row carries a month
 * and a year and nothing to span.
 */

/** The wire format the `<MonthPicker>` speaks — also the API's `from`/`to`. */
export const ISO_MONTH = 'yyyy-MM'

/** Month names, indexed by the API's own 1-based `month`. */
export const REPORT_MONTH_NAMES: string[] = [
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

/** A month number → its name, for headings and the applied-filter chips. */
export function reportMonthName(month: number): string {
  return REPORT_MONTH_NAMES[month - 1] ?? ''
}

/** The Month dropdown — values are the API's 1-based month as a string. */
export const REPORT_MONTH_OPTIONS: ComboboxOption[] = REPORT_MONTH_NAMES.map(
  (label, index) => ({ label, value: String(index + 1) }),
)

/**
 * How far back the Year dropdown reaches. Payroll is re-read years after it was
 * run — a PF query, an audit, a demand notice — so this goes back further than
 * the register's own picker, and stops at the current year: a future period has
 * no processed month to report on.
 */
export const REPORT_YEARS_BACK = 10

/** The Year dropdown, newest first — the year being filed is the common read. */
export function reportYearOptions(today: Date = new Date()): ComboboxOption[] {
  const current = today.getFullYear()
  return Array.from({ length: REPORT_YEARS_BACK + 1 }, (_, index) => {
    const year = current - index
    return { label: String(year), value: String(year) }
  })
}

/** Bounds for the Gross Salary range pickers, which are `<MonthPicker>`s. */
export function reportMonthBounds(today: Date = new Date()): {
  minDate: Date
  maxDate: Date
} {
  const base = startOfMonth(today)
  return { minDate: addYears(base, -REPORT_YEARS_BACK), maxDate: base }
}

/** `{ month, year }` → the `yyyy-MM` string the range pickers hold. */
export function toIsoMonth(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), ISO_MONTH)
}

/**
 * A `yyyy-MM` string back into the pair a period is filtered by. `null` for a
 * cleared or unparseable field — the screen keeps the last valid period rather
 * than reading "no month", which no report can answer.
 */
export function fromIsoMonth(value: string): { month: number; year: number } | null {
  if (!value) return null
  const parsed = parse(value, ISO_MONTH, new Date())
  if (Number.isNaN(parsed.getTime())) return null
  return { month: parsed.getMonth() + 1, year: parsed.getFullYear() }
}

/** `yyyy-MM` printed the way a heading reads it — "July 2026". */
export function formatIsoMonth(value: string): string {
  const parsed = fromIsoMonth(value)
  return parsed ? `${reportMonthName(parsed.month)} ${parsed.year}` : value
}

/**
 * Rows per page. Five matches the app's list density, and several of these
 * reports (the Pay Register at twenty-nine columns, the ECR at fourteen) are
 * wide enough that a taller page would scroll in both directions at once.
 */
export const REPORT_PAGE_SIZE = 5
export const REPORT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100]

/**
 * `<DataTable>`'s size selector always offers "All", which it reports back as a
 * negative limit. No report endpoint can answer "everything", so the shared hook
 * clamps that to the largest page rather than sending a request the API refuses.
 */
export const REPORT_MAX_LIMIT = 500
