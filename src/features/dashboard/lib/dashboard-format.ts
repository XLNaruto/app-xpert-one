import { formatDecimal } from '@/lib/currency'
import { GRANULARITY_AXIS_LABELS } from '../constants'
import type { Granularity, MetricUnit } from '../types'

/**
 * Every number this screen prints goes through here.
 *
 * THE RULE THAT MATTERS: a null rate is an UNMEASURED rate, never a zero. Any
 * `*_rate`, `share`, `change_pct`, `average_*` or radar score is null when its
 * denominator was zero, and "nobody was present" is a different statement from
 * "nobody present was on time". So every formatter below answers an em-dash for
 * null — and the charts break their lines rather than plotting a point at zero,
 * because plotting a null as zero turns "we did not measure this" into "we
 * scored nothing at this", which is a different and much worse claim to put in
 * front of an HR director.
 */

/** What an unmeasured figure reads as. Never `0`, never `0%`. */
export const EM_DASH = '—'

/** Month names for a calendar-date label, indexed 1..12 by the string's month. */
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

/** A whole count, grouped Indian-style. */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-IN')
}

/** A fractional figure (hours, days) — two decimals at most, none on a whole. */
export function formatQuantity(value: number | null): string {
  if (value == null) return EM_DASH
  return formatDecimal(value)
}

/**
 * RUPEES with two decimals — these are payroll figures, not paise.
 *
 * The super-admin console's dashboard serves `*_paise` because those are
 * Razorpay's captured payments; nothing here is ever divided by 100, and a
 * figure from that API is never added to one from this one.
 */
export function formatMoney(value: number | null): string {
  if (value == null) return EM_DASH
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

/** Rupees with no decimals — for an axis tick, where the paise are noise. */
export function formatMoneyShort(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(value)
}

/**
 * A RATIO — a fraction in `0..1` — as a percentage. `0.82` reads "82%".
 *
 * Four decimals is all the API gives and all anyone needs, so one decimal place
 * out is plenty. A ratio is NEVER already a percentage: nothing on this API
 * serves 82 meaning 82%.
 */
export function formatRatio(value: number | null, decimals = 1): string {
  if (value == null) return EM_DASH
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * A `change_pct` as a signed percentage. It compares FLOWS, not totals.
 *
 * Null does not read "0%" and does not read "+∞%": the previous window was
 * empty, so the honest word is "New".
 */
export function formatChange(value: number | null): string {
  if (value == null) return 'New'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(0)}%`
}

/** A signed whole number — `net` can be negative, and that has to show. */
export function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatCount(value)}`
}

/** Format any figure by the unit its series or breakdown declared. */
export function formatByUnit(value: number | null, unit: MetricUnit): string {
  if (value == null) return EM_DASH
  if (unit === 'amount') return formatMoney(value)
  if (unit === 'count') return formatCount(value)
  return formatQuantity(value)
}

/** An axis tick by unit — compact, because a tick has no room for paise. */
export function formatTickByUnit(value: number, unit: MetricUnit): string {
  if (unit === 'amount') return formatMoneyShort(value)
  if (unit === 'count') return formatCount(value)
  return formatDecimal(value)
}

/**
 * A `bucket` / heatmap `date` — a plain `YYYY-MM-DD` CALENDAR DATE — as a label.
 *
 * SPLIT THE STRING; do not pass it through `new Date()`. The string is already
 * correct in the requested timezone, and re-reading it in the browser's zone
 * shifts a Monday's punches onto Sunday. (`from` / `to` / `contract_ends_on` are
 * the other way round — those are real timestamps and format normally.)
 */
export function formatCalendarDate(bucket: string): string {
  const [year, month, day] = bucket.split('-')
  const monthName = MONTH_NAMES[Number(month) - 1]
  if (!year || !monthName || !day) return bucket
  return `${Number(day)} ${monthName} ${year}`
}

/** The same date without its year — for a dense axis. */
export function formatCalendarDayMonth(bucket: string): string {
  const [, month, day] = bucket.split('-')
  const monthName = MONTH_NAMES[Number(month) - 1]
  if (!monthName || !day) return bucket
  return `${Number(day)} ${monthName}`
}

/** `2026-08` → `Aug 2026`, for a monthly axis. */
export function formatCalendarMonth(bucket: string): string {
  const [year, month] = bucket.split('-')
  const monthName = MONTH_NAMES[Number(month) - 1]
  if (!year || !monthName) return bucket
  return `${monthName} ${year}`
}

/**
 * A bucket tick, named for the grain the RESPONSE reported — never the grain
 * that was requested. Under `all_time` the server escalates day → week → month
 * so the chart stays drawable, and a daily label on monthly buckets is a lie.
 */
export function formatBucketTick(bucket: string, granularity: Granularity): string {
  if (granularity === 'month') return formatCalendarMonth(bucket)
  return formatCalendarDayMonth(bucket)
}

/** The full bucket, for a tooltip title. A week's bucket IS its Monday. */
export function formatBucketFull(bucket: string, granularity: Granularity): string {
  if (granularity === 'month') return formatCalendarMonth(bucket)
  if (granularity === 'week') return `Week of ${formatCalendarDate(bucket)}`
  return formatCalendarDate(bucket)
}

/** How the axis of a chart at this grain is captioned. */
export function granularityAxisLabel(granularity: Granularity): string {
  return GRANULARITY_AXIS_LABELS[granularity]
}

/**
 * A resolved `from` / `to` pair as a window caption. These two ARE real
 * timestamps (unlike a bucket), so they parse and format normally.
 */
export function formatWindow(from: string, to: string): string {
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${from} – ${to}`
  }
  const fmt = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

/**
 * `as_of` — WHEN THE NIGHTLY ROLLUP WAS LAST REBUILT, as a caption.
 *
 * It is a real instant (unlike a bucket), so it parses and formats normally.
 * Every figure on the screen is as of this moment rather than live, which is
 * why the page shows it once: a user asking why this morning's check-in is
 * missing has this line as the answer.
 *
 * `null` is the case that matters. It means the job has NEVER run for this
 * account — every figure will be zero — and it reads "Not yet computed", NEVER
 * "no activity". The two are indistinguishable in the data and mean opposite
 * things: one is a pipeline that has not started, the other is a quiet month.
 */
export function formatAsOf(asOf: string | null): string {
  if (!asOf) return NOT_YET_COMPUTED
  const parsed = new Date(asOf)
  if (Number.isNaN(parsed.getTime())) return asOf
  return `As of ${new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)}`
}

/** What an account whose rollup has never run reads as. Not "no activity". */
export const NOT_YET_COMPUTED = 'Not yet computed'

/** A real date field (`contract_ends_on`, `joining_date`) — a timestamp, so parsed. */
export function formatDateField(value: string | null): string {
  if (!value) return EM_DASH
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

/** Hours as a duration — `2.5` reads "2.5 h". */
export function formatHours(value: number | null): string {
  if (value == null) return EM_DASH
  return `${formatDecimal(value)} h`
}

/** Days, halves included — `12.5` reads "12.5 days". */
export function formatDays(value: number | null): string {
  if (value == null) return EM_DASH
  return `${formatDecimal(value)} ${value === 1 ? 'day' : 'days'}`
}
