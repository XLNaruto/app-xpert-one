/**
 * Date translation between the form and the API.
 *
 * Forms hold a plain `yyyy-MM-dd` (that's what `<DatePicker>` gives and takes)
 * while the API's date columns are declared `date-time`. Converting in one place
 * keeps every mapper from re-deriving it — and keeps the conversion off local
 * time, which is what would otherwise shift a joining date by a day for anyone
 * east or west of UTC.
 */

/** How many characters of an ISO timestamp make up its date. */
const DATE_LENGTH = 10

/** How many characters of an ISO timestamp make up its month. */
const MONTH_LENGTH = 7

/**
 * `yyyy-MM-dd` → the ISO instant the API stores, pinned to UTC midnight. A blank
 * field answers `null`, which is how the API records "not set".
 */
export function toApiDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return `${trimmed.slice(0, DATE_LENGTH)}T00:00:00.000Z`
}

/**
 * The same, for a date the endpoint requires. Callers reach here only past
 * validation, so a blank would be a bug — it still degrades to today rather than
 * sending an invalid body.
 */
export function toRequiredApiDate(value: string): string {
  return toApiDate(value) ?? toApiDate(todayIso())!
}

/** An API timestamp → the `yyyy-MM-dd` a date field holds. */
export function toFormDate(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, DATE_LENGTH)
}

/**
 * An API value → the `yyyy-MM` a month field holds. The experience endpoint
 * already answers months, but a full timestamp is trimmed just as safely.
 */
export function toFormMonth(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, MONTH_LENGTH)
}

/** Today as `yyyy-MM-dd`, in the viewer's own calendar day. */
export function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, DATE_LENGTH)
}

/**
 * A renewal date derived from the contract's start and length —
 * `joiningDate + period(type) − 1 day`, so a one-year contract starting on the
 * 1st of April renews on the 31st of March, not the 1st.
 *
 * Answers `''` when either input is missing, which leaves the field for the user.
 */
export function deriveRenewalDate(
  joiningDate: string,
  period: string,
  periodType: string,
): string {
  const count = Number(period)
  if (!joiningDate || !Number.isFinite(count) || count <= 0) return ''

  const date = new Date(`${joiningDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''

  if (periodType === 'YEAR') date.setUTCFullYear(date.getUTCFullYear() + count)
  else if (periodType === 'MONTH') date.setUTCMonth(date.getUTCMonth() + count)
  else date.setUTCDate(date.getUTCDate() + count)

  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, DATE_LENGTH)
}
