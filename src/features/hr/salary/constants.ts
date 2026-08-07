import { addMonths, startOfMonth } from 'date-fns'
import type { SalaryStatus } from './schemas'

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
 * eight saves. The API caps `limit` at 200, so that's the last option offered.
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
