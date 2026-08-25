/**
 * Date arithmetic the leave rules are written in — pure, no React.
 *
 * The API's business day is **IST**, not the browser's zone. A desk in another
 * zone (or a laptop with a skewed clock) would otherwise disagree with the server
 * about which date "tomorrow" is, and the form would reject a date the API
 * accepts, or accept one it rejects with a 400.
 */

/** IST is a fixed UTC+05:30 — no daylight saving to track. */
const IST_OFFSET_MINUTES = 5 * 60 + 30

const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE

/** How many characters of an ISO timestamp make up its date. */
export const DATE_LENGTH = 10

/** Today's date in IST, as `yyyy-MM-dd`. */
export function istToday(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE)
  return shifted.toISOString().slice(0, DATE_LENGTH)
}

/**
 * The earliest `from_date` a new leave may carry — **tomorrow** in IST. A leave
 * is filed ahead of the day it is taken; today and earlier answer a 400.
 */
export function earliestLeaveDate(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE)
  return new Date(shifted.getTime() + MS_PER_DAY).toISOString().slice(0, DATE_LENGTH)
}

/** A `yyyy-MM-dd` as a local `Date`, for a picker's `minDate`. */
export function asLocalDate(day: string): Date {
  return new Date(`${day}T00:00:00`)
}

/**
 * How many days a range covers, inclusive — `2 Nov → 6 Nov` is 5, not 4. A half
 * day is half of the single date it covers.
 *
 * Used only to warn that a range will overflow the type's paid allowance; the
 * server does the authoritative arithmetic (it also knows about weekly offs and
 * holidays, which this deliberately does not).
 */
export function leaveDayCount(
  fromDate: string,
  toDate: string,
  duration: 'FULL_DAY' | 'HALF_DAY',
): number {
  if (!fromDate || !toDate || toDate < fromDate) return 0
  if (duration === 'HALF_DAY') return 0.5
  const span = asLocalDate(toDate).getTime() - asLocalDate(fromDate).getTime()
  return Math.round(span / MS_PER_DAY) + 1
}
