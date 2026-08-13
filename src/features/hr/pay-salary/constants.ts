import { addYears, format, parse, startOfMonth } from 'date-fns'

/**
 * Pay Salary — the two tabs, the payment modes, and the period the screen reads
 * for. Nothing here computes pay: this screen only settles figures another
 * screen committed.
 */

/** The wire format the app's `<MonthPicker>` speaks. */
export const ISO_MONTH = 'yyyy-MM'

/** Which side of the period is open. The API's own `?status=`. */
export type PaySalaryStatus = 'unpaid' | 'paid'

export const PAY_SALARY_TABS: { value: PaySalaryStatus; label: string }[] = [
  { value: 'unpaid', label: 'Unpaid Salary' },
  { value: 'paid', label: 'Paid Salary' },
]

/**
 * How the money left. Taken verbatim from the batch endpoint's enum — a mode
 * outside it is a 400, so the dialog offers exactly these seven and no "other
 * text" escape hatch.
 */
export const PAYMENT_MODES = [
  'Cash',
  'Cheque',
  'NEFT',
  'RTGS',
  'UPI',
  'Online',
  'Other',
] as const

export type PaymentMode = (typeof PAYMENT_MODES)[number]

export const PAYMENT_MODE_OPTIONS = PAYMENT_MODES.map((mode) => ({
  label: mode,
  value: mode,
}))

/**
 * The three modes the *bank's* bulk-transfer sheet is generated for — a
 * narrower set than a batch accepts, because the sheet is the bank's own upload
 * template and it only carries electronic transfers.
 */
export const BANK_TRANSFER_MODES = ['NEFT', 'RTGS', 'IMPS'] as const

export type BankTransferMode = (typeof BANK_TRANSFER_MODES)[number]

export const BANK_TRANSFER_MODE_OPTIONS = BANK_TRANSFER_MODES.map((mode) => ({
  label: mode,
  value: mode,
}))

/** What the payment-document presign will sign for. */
export const PAYMENT_DOCUMENT_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** What the file picker offers, in the `accept` form the dropzone reads. */
export const PAYMENT_DOCUMENT_ACCEPT = 'application/pdf,image/*'

/** The batch's own cap on proof documents. */
export const MAX_PAYMENT_DOCUMENTS = 10

/** The largest selection one Confirm & Pay may settle. */
export const MAX_PAYMENTS_PER_BATCH = 500

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

/** A month number → its name, for headings and dialog subtitles. */
export function payMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? ''
}

/**
 * How far back the period picker reaches. A payment is entered late and queried
 * for years — a bank reconciliation, an audit — so this matches View Salary's
 * reach, and stops at the month in progress: a future month has no salary to
 * have been processed, let alone paid.
 */
export const PAY_SALARY_YEARS_BACK = 10

export function paySalaryMonthBounds(today: Date = new Date()): {
  minDate: Date
  maxDate: Date
} {
  const base = startOfMonth(today)
  return { minDate: addYears(base, -PAY_SALARY_YEARS_BACK), maxDate: base }
}

/** `{ month, year }` → the `yyyy-MM` string the picker holds. */
export function toIsoMonth(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), ISO_MONTH)
}

/**
 * A `yyyy-MM` string back into the pair the list is read for. `null` for a
 * cleared or unparseable field, which the screen ignores — there is no "every
 * month" read, so the last valid period stays on screen.
 */
export function fromIsoMonth(value: string): { month: number; year: number } | null {
  if (!value) return null
  const parsed = parse(value, ISO_MONTH, new Date())
  if (Number.isNaN(parsed.getTime())) return null
  return { month: parsed.getMonth() + 1, year: parsed.getFullYear() }
}

/**
 * Rows per page. `GET /user/salary/payments` caps `limit` at 500 and has no way
 * to answer "everything", so there is no "All" — `<DataTable>`'s size selector
 * reports All back as a negative limit and the list hook clamps it to this.
 */
export const PAY_SALARY_PAGE_SIZE = 10
export const PAY_SALARY_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
export const PAY_SALARY_MAX_LIMIT = 500

/**
 * The history screen's own page — of *batches*, not people. A period is rarely
 * paid in more than a handful, so the cards page smaller than the list does.
 */
export const PAYMENT_HISTORY_PAGE_SIZE = 10
export const PAYMENT_HISTORY_MAX_LIMIT = 100

/**
 * Employees per page inside one expanded batch. The card carries its own pager
 * rather than a `<DataTable>`: it is a panel inside a card, not a list screen.
 */
export const BATCH_EMPLOYEE_PAGE_SIZE = 10

/**
 * Sortable fields on these endpoints: **none**. Neither the payments list nor
 * the history takes a `sort`, so every column sets `enableSorting: false` — a
 * header click that only reordered the page in the browser would lie about the
 * other pages.
 */
export const PAY_SALARY_SORT_FIELDS: readonly string[] = []
