import { addMonths, format, isValid, parse, startOfMonth } from 'date-fns'
import { EFFECTIVE_MONTH_RANGE } from '../constants'

/** The wire format for an effective month — a month has no day. */
const MONTH_FORMAT = 'yyyy-MM'

/** Parse a `yyyy-MM` value; anything malformed reads as `null`. */
function parseMonth(value: string): Date | null {
  const parsed = parse(value, MONTH_FORMAT, new Date())
  return isValid(parsed) ? parsed : null
}

/** Render a `yyyy-MM` value as "Sep 2026"; malformed falls back to the raw. */
export function formatMonth(value: string): string {
  const parsed = parseMonth(value)
  return parsed ? format(parsed, 'MMM yyyy') : value
}

/**
 * The window the effective-from picker allows — a span around the current month,
 * so a structure can be backdated to a month already run or queued up for one
 * still to come, but not to an arbitrary year.
 */
export function effectiveMonthBounds(today: Date = new Date()): {
  minDate: Date
  maxDate: Date
} {
  const base = startOfMonth(today)
  return {
    minDate: addMonths(base, -EFFECTIVE_MONTH_RANGE.back),
    maxDate: addMonths(base, EFFECTIVE_MONTH_RANGE.forward),
  }
}

/** Sort comparator putting the most recent effective month first. */
export function byEffectiveMonthDesc(
  a: { effectiveFrom: string },
  b: { effectiveFrom: string },
): number {
  return b.effectiveFrom.localeCompare(a.effectiveFrom)
}
