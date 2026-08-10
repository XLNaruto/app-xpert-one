import { addMonths, startOfMonth } from 'date-fns'
import type { SalaryStatus } from './schemas'
import type { SalaryRates } from './types'

/**
 * No statutory rate in force — what the screen prices against before the
 * register has answered, and the same thing it prices against for an act whose
 * master has no rate covering the period: nothing is deducted.
 *
 * A frozen constant rather than a fresh object per render, so the memo that
 * feeds `rowFigures` doesn't invalidate every row on every keystroke.
 */
export const EMPTY_SALARY_RATES: SalaryRates = {
  pf: null,
  esic: null,
  pt: null,
  lwf: null,
}

/**
 * The two sides of the register, as the tabs above the grid label them. The
 * values are the API's own `?status=` — the split is applied in SQL, so a tab is
 * a different read rather than a filter over one.
 */
export const SALARY_STATUS_TABS: { value: SalaryStatus; label: string }[] = [
  { value: 'pending', label: 'To Process' },
  { value: 'complete', label: 'Processed' },
]

/**
 * Rows per page. Higher than the app's default of five, because this screen is
 * worked down a page at a time — a payroll run of forty people shouldn't take
 * eight saves.
 *
 * `GET /user/salary/register` caps `limit` at 200 and defaults to 20, so 200 is
 * the last size offered and there is no "All": the endpoint has no way to answer
 * one, and a size it would refuse doesn't belong in the selector.
 */
export const SALARY_PAGE_SIZE = 20
export const SALARY_PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200]

/**
 * How far the month picker reaches. Back far enough to run or re-run a month
 * that was missed, and no further forward than the month in progress: pay is
 * computed from attendance, and a future month has none to compute from.
 */
export const SALARY_MONTH_RANGE = { back: 24 } as const

export function salaryMonthBounds(today: Date = new Date()): {
  minDate: Date
  maxDate: Date
} {
  const base = startOfMonth(today)
  return { minDate: addMonths(base, -SALARY_MONTH_RANGE.back), maxDate: base }
}
