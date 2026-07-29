import { WAGE_DAYS_PER_MONTH } from '../constants'

/** Parse a numeric form input; blank / malformed reads as 0. */
export function toAmount(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Parse an optional numeric form input; blank reads as `null`. */
export function toOptionalAmount(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Wage for a single day — the monthly basic spread over the statutory 26 paid
 * days. Derived, never captured: the form shows it read-only.
 */
export function calculateWagePerDay(basicPay: string | number): number {
  const basic = typeof basicPay === 'number' ? basicPay : toAmount(basicPay)
  return basic / WAGE_DAYS_PER_MONTH
}
