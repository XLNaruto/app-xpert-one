import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { UpdateFrequency } from '../types'

/**
 * Pure date + duration helpers for the Office Task screens. Every calendar date
 * travels as `yyyy-MM-dd` (what `<DatePicker>` speaks); times are ISO strings.
 */

/** Today as `yyyy-MM-dd`, in the browser's own zone. */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** `date` shifted by `days`, as `yyyy-MM-dd`. */
export function shiftIso(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd')
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from))
}

/** Every `yyyy-MM-dd` from `from` to `to`, both ends included. */
export function eachIso(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = shiftIso(d, 1)) out.push(d)
  return out
}

/** "Today" / "Yesterday" / "Tomorrow" / "Tue, 18 Sep 2026". */
export function dayLabel(date: string): string {
  const diff = daysBetween(todayIso(), date)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  return format(parseISO(date), 'EEE, dd MMM yyyy')
}

const PERIOD_NOUN: Record<UpdateFrequency, string> = { daily: 'day', weekly: 'week', monthly: 'month' }

/** "Once a day" / "Twice a week" / "3 times a month". */
export function frequencyLabel(times: number, frequency: UpdateFrequency = 'daily'): string {
  const period = PERIOD_NOUN[frequency]
  if (times <= 1) return `Once a ${period}`
  if (times === 2) return `Twice a ${period}`
  return `${times} times a ${period}`
}

/** The current window a progress count covers: "today" / "this week" / "this month". */
export function periodLabel(frequency: UpdateFrequency = 'daily'): string {
  return frequency === 'daily' ? 'today' : `this ${PERIOD_NOUN[frequency]}`
}

/** The same window as a heading: "Updates Today" / "Updates This Week" / "Updates This Month". */
export function updatesHeading(frequency: UpdateFrequency = 'daily'): string {
  return frequency === 'daily' ? 'Updates Today' : `Updates This ${PERIOD_NOUN[frequency] === 'week' ? 'Week' : 'Month'}`
}

/** Seconds as a stopwatch: `4:05` under an hour, `1:04:05` past it. */
export function formatStopwatch(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Seconds as a zero-padded clock: `04:13:10`. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** Seconds as prose: `1h 4m`, `13m 0s`, `0m 0s` for nothing. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`
}

/**
 * How far a deadline is, from the viewer's today: "5 days left", "Due today",
 * "3 days overdue". `tone` colours it — amber inside two days, red past it.
 */
export function deadlineInfo(deadline: string): {
  label: string
  tone: 'normal' | 'warning' | 'danger'
  daysLeft: number
} {
  const daysLeft = daysBetween(todayIso(), deadline)
  if (daysLeft < 0) {
    const n = -daysLeft
    return { label: `${n} day${n === 1 ? '' : 's'} overdue`, tone: 'danger', daysLeft }
  }
  if (daysLeft === 0) return { label: 'Due Today', tone: 'warning', daysLeft }
  return {
    label: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
    tone: daysLeft <= 2 ? 'warning' : 'normal',
    daysLeft,
  }
}

/**
 * The local calendar day of an ISO date-time. Timestamps arrive in UTC (`Z`), so
 * slicing the string would put an evening hand-in in India on the wrong day.
 */
export function localDateOf(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd')
}
