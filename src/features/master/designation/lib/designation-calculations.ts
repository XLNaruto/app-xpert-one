import { WAGE_DAYS_PER_MONTH } from '../constants'
import type { DesignationFormValues } from '../schemas'

/** Overtime hours in a working day — the divisor behind the derived OT rate. */
const HOURS_PER_DAY = 8

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

/**
 * Overtime rate for one hour, as the designation form arrives at it. Entered by
 * hand on "Manual"; on "As Per Calculation" it comes off the wage per day at
 * double time, matching what the form's formula strip describes.
 *
 * The API stores the rate alone — it has no field for *how* it was worked out —
 * so a derived rate is computed here and sent as a plain figure.
 */
export function deriveDesignationOvertimeRate(
  values: Pick<
    DesignationFormValues,
    'basicPay' | 'overtimeApplicable' | 'overtimeCalculationType' | 'overtimeRatePerHour'
  >,
): number | null {
  if (!values.overtimeApplicable) return null
  if (values.overtimeCalculationType === 'Manual') {
    return toOptionalAmount(values.overtimeRatePerHour)
  }
  const basic = toOptionalAmount(values.basicPay)
  if (basic === null) return null
  return (calculateWagePerDay(basic) / HOURS_PER_DAY) * 2
}
