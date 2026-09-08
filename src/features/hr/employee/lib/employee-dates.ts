/**
 * Date translation between the form and the API.
 *
 * Both sides speak plain `yyyy-MM-dd` — that's what `<DatePicker>` gives and
 * takes, and what the API's date fields expect. What travels is therefore a
 * calendar day and never an instant: no timezone is applied in either direction,
 * so a joining date can't shift by a day for anyone east or west of UTC.
 * Responses may still carry a full timestamp, which is trimmed back to its date.
 */

/** How many characters of an ISO timestamp make up its date. */
const DATE_LENGTH = 10

/** How many characters of an ISO timestamp make up its month. */
const MONTH_LENGTH = 7

/**
 * A form date → the `yyyy-MM-dd` the API takes. A blank field answers `null`,
 * which is how the API records "not set". Anything longer (a value seeded
 * straight off a timestamped response) is trimmed back to its date.
 */
export function toApiDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, DATE_LENGTH)
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
 * The renewal date derived from the contract's start and length — the day the
 * desk is WARNED, not the day the term ends.
 *
 * This is the same rule the API applies, and the reason it matters is that
 * `renewal_date` is what `GET /user/employee-contracts/expiring` compares
 * against: a posting appears on the contract-expiry worklist the day this date
 * arrives, and the API reads the real end of the term back off
 * `renewal_date + lead`. Storing the END here instead would warn the desk on the
 * last day of the contract, a month late, and push the end the panel reports a
 * month past the truth.
 *
 * The lead, by unit of the term — one month before the end for a YEAR or MONTH
 * contract, thirty days for a DAY one:
 *
 *     joiningDate + period(type) - lead(type)
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

  // The end of the term first…
  if (periodType === 'YEAR') date.setUTCFullYear(date.getUTCFullYear() + count)
  else if (periodType === 'MONTH') date.setUTCMonth(date.getUTCMonth() + count)
  else date.setUTCDate(date.getUTCDate() + count)

  // …then back off the warning lead. A DAY term is warned about 30 days out;
  // anything measured in months or years, one month out.
  if (periodType === 'DAY') date.setUTCDate(date.getUTCDate() - 30)
  else date.setUTCMonth(date.getUTCMonth() - 1)

  return date.toISOString().slice(0, DATE_LENGTH)
}
