import { PERIOD_TYPE_NOUNS, WARNING_LEAD } from '../constants'
import type { ContractPeriodType, ExpiringContract } from '../types'

/**
 * How this screen prints a date, a term and a countdown.
 *
 * THE RULE: every date on this API is a plain `yyyy-MM-dd` CALENDAR DAY. None of
 * them goes through `new Date(value)` and back out through a formatter — that
 * reads the string as midnight UTC and prints it in the viewer's zone, which
 * moves the day for anyone west of Greenwich. So the string is split and
 * reassembled by hand, and the day that was sent is the day that is shown.
 */

/** What an absent date or an unmeasurable figure reads as. */
export const EM_DASH = '—'

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** `2027-08-14` → `14 Aug 2027`. Anything unparseable is shown as it arrived. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return EM_DASH
  const [year, month, day] = value.slice(0, 10).split('-')
  const name = MONTH_NAMES[Number(month) - 1]
  if (!year || !name || !day) return value
  return `${Number(day)} ${name} ${year}`
}

/**
 * `days_to_end` in words. NEGATIVE is the number that makes an expired row read
 * as overdue, so it is spelled out rather than shown as a minus sign.
 */
export function formatDaysToEnd(days: number | null): string {
  if (days == null) return EM_DASH
  if (days === 0) return 'ends today'
  if (days < 0) {
    const overdue = Math.abs(days)
    return `${overdue} ${overdue === 1 ? 'day' : 'days'} overdue`
  }
  return `in ${days} ${days === 1 ? 'day' : 'days'}`
}

/** `1` + `YEAR` → `1 year`; `18` + `MONTH` → `18 months`. */
export function formatTerm(
  period: number | null,
  type: ContractPeriodType | null,
): string {
  if (period == null || !type) return EM_DASH
  const noun = PERIOD_TYPE_NOUNS[type]
  return `${period} ${period === 1 ? noun : `${noun}s`}`
}

/**
 * The row's placement line — designation · department · branch · company.
 *
 * Every level is optional in this product, so the null segments are skipped
 * rather than printed as em-dashes: four dashes in a row say nothing about where
 * somebody works.
 */
export function formatPlacement(row: ExpiringContract): string {
  const parts = [
    row.designationName,
    row.departmentName,
    row.branchName,
    row.companyName,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : EM_DASH
}

/* ── Client-side previews — GUIDANCE ONLY ──────────────────────────────────
 *
 * The two helpers below reproduce the API's arithmetic so the renew dialog can
 * say what a term will run to BEFORE it is saved. They are never used to render
 * a row: after the call the screen shows `contractEndsOn` off the RESPONSE,
 * because a renewal keeps the joining date and replaces the period, so any local
 * recomputation of a saved contract's end names the term that was replaced.
 */

/** A `yyyy-MM-dd` as its calendar parts — no `Date`, no zone. */
function parseDay(value: string): { year: number; month: number; day: number } | null {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return { year, month, day }
}

function toDayString(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Days in a month, so adding months can clamp rather than roll into the next. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * `start` plus `count` of `type`. Month arithmetic CLAMPS — 31 Jan plus one
 * month is 28/29 Feb, never 2/3 Mar — which is what a contract term means when
 * a human reads it.
 */
export function addPeriod(
  start: string,
  count: number,
  type: ContractPeriodType,
): string | null {
  const parts = parseDay(start)
  if (!parts || !Number.isFinite(count)) return null

  if (type === 'DAY') {
    const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + count))
    return shifted.toISOString().slice(0, 10)
  }

  const months = type === 'YEAR' ? count * 12 : count
  const zeroBased = parts.month - 1 + months
  const year = parts.year + Math.floor(zeroBased / 12)
  const month = ((zeroBased % 12) + 12) % 12 + 1
  return toDayString(year, month, Math.min(parts.day, daysInMonth(year, month)))
}

/**
 * The warning date a term ending on `end` would get — the API's own lead, run
 * backwards, so the dialog can preview the review date it is about to cause.
 * One month before the end for a YEAR or MONTH term, thirty days for a DAY one.
 */
export function previewReviewDate(
  end: string,
  type: ContractPeriodType,
): string | null {
  const lead = WARNING_LEAD[type]
  if (lead.days) return addPeriod(end, -lead.days, 'DAY')
  return addPeriod(end, -(lead.months ?? 0), 'MONTH')
}
