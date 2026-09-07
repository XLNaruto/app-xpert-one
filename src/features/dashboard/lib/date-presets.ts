import {
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  subDays,
} from 'date-fns'
import type { DatePreset } from '../types'

/**
 * The named windows the filter bar offers, as `yyyy-MM-dd` pairs.
 *
 * Everything except "All time" is a from+to pair computed here; "All time" sends
 * `all_time=true` and its dates are ignored (they are still filled in so the
 * pickers have something to show when the user switches back off it).
 *
 * Weeks start MONDAY, matching the Postgres convention the `/series` buckets
 * use — a week's bucket string IS its Monday, so a picker that opened weeks on
 * Sunday would put the range one day off the chart drawn from it.
 */

/** The wire format for a date the pickers hold. */
const DATE_FORMAT = 'yyyy-MM-dd'

export interface DateWindow {
  from: string
  to: string
}

/**
 * The Indian financial year containing `today` — 1 April to 31 March.
 *
 * April is month index 3, so anything from January to March belongs to the year
 * that began in the PREVIOUS calendar year.
 */
function financialYear(today: Date): DateWindow {
  const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1
  return {
    from: `${year}-04-01`,
    to: `${year + 1}-03-31`,
  }
}

/**
 * Resolve a preset against `today` (injectable so this stays a pure function).
 *
 * `all_time` returns the last-30-days pair as a placeholder: the flag is what
 * the request carries, and the dates only matter again once the user picks a
 * bounded preset.
 */
export function resolvePreset(preset: DatePreset, today = new Date()): DateWindow {
  const iso = (date: Date) => format(date, DATE_FORMAT)

  switch (preset) {
    case 'today':
      return { from: iso(today), to: iso(today) }
    case 'this_week':
      return {
        from: iso(startOfWeek(today, { weekStartsOn: 1 })),
        to: iso(endOfWeek(today, { weekStartsOn: 1 })),
      }
    case 'this_month':
      return { from: iso(startOfMonth(today)), to: iso(endOfMonth(today)) }
    case 'this_quarter':
      return { from: iso(startOfQuarter(today)), to: iso(endOfQuarter(today)) }
    case 'this_financial_year':
      return financialYear(today)
    case 'last_30_days':
    case 'all_time':
    default:
      // The API's own default window, and the placeholder behind `all_time`.
      return { from: iso(subDays(today, 29)), to: iso(today) }
  }
}

/** Whether a hand-edited date pair still matches the preset it came from. */
export function matchesPreset(
  preset: DatePreset,
  window: DateWindow,
  today = new Date(),
): boolean {
  const resolved = resolvePreset(preset, today)
  return resolved.from === window.from && resolved.to === window.to
}
