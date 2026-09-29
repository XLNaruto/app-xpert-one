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
 * day is half of **every** date in its range, so `1 Oct → 5 Oct` at half a day
 * each is `2.5`.
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
  const span = asLocalDate(toDate).getTime() - asLocalDate(fromDate).getTime()
  const days = Math.round(span / MS_PER_DAY) + 1
  return duration === 'HALF_DAY' ? days * 0.5 : days
}

/** A half day is exactly this long — the API refuses any other length with a 400. */
export const HALF_DAY_HOURS = 4

const MINUTES_PER_DAY = 24 * 60

/** `HH:MM` (or `HH:MM:SS`) → minutes since midnight, `null` if unreadable. */
function toMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Where a half day that starts at `fromTime` has to end — `HALF_DAY_HOURS`
 * later, as `HH:MM`. Blank when the start is blank, or when the slot would run
 * past midnight (the API compares the two times on one day, so there is no valid
 * end to offer).
 */
export function halfDayEndTime(fromTime: string): string {
  const start = toMinutes(fromTime)
  if (start === null) return ''
  const end = start + HALF_DAY_HOURS * 60
  if (end >= MINUTES_PER_DAY) return ''
  const hh = String(Math.floor(end / 60)).padStart(2, '0')
  const mm = String(end % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/** Minutes between two `HH:MM` times — negative when `to` is earlier. */
export function minutesBetween(fromTime: string, toTime: string): number | null {
  const from = toMinutes(fromTime)
  const to = toMinutes(toTime)
  return from === null || to === null ? null : to - from
}
