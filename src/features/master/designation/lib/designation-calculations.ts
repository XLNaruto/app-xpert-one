import { getDay, getDaysInMonth, isValid, parse } from 'date-fns'
import { WAGE_DAYS_PER_MONTH } from '../constants'
import type { DesignationFormValues } from '../schemas'

/** Overtime hours in a working day — the divisor behind the derived OT rate. */
const HOURS_PER_DAY = 8

/**
 * Parse a numeric form input; blank, absent or malformed reads as 0.
 *
 * Absent as well as blank: react-hook-form drops a field's value when its input
 * unmounts, so a cell the row conditionally hides can reach a mapper as
 * `undefined` rather than `''`. A parser is the wrong place to throw over that —
 * "no figure" is an answer these fields have.
 */
export function toAmount(value: string | null | undefined): number {
  const parsed = Number(value ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

/** Parse an optional numeric form input; blank or absent reads as `null`. */
export function toOptionalAmount(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** The bounds a fixed working-days figure must sit in — a month has 1–31 days. */
export const WORKING_DAYS_MIN = 1
export const WORKING_DAYS_MAX = 31

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

/**
 * The calendar's working days for a month: the days in it minus its weekly offs.
 *
 * `month` is the applicable `yyyy-MM`; blank or malformed reads as the current
 * month (the designation create form has no month of its own). The off day is
 * the weekly off chosen, defaulting to Sunday when none is — a Fixed designation
 * has no weekly off field. "Rotation" has no fixed day, so it takes one off per
 * full week.
 */
export function calendarWorkingDays(month?: string, weeklyOff?: string): number {
  const parsed = month ? parse(month, 'yyyy-MM', new Date()) : new Date()
  const date = isValid(parsed) ? parsed : new Date()
  const days = getDaysInMonth(date)

  if (weeklyOff === 'Rotation') return days - Math.floor(days / 7)

  const named = WEEKDAYS.indexOf(weeklyOff as (typeof WEEKDAYS)[number])
  const offDay = named === -1 ? 0 : named
  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  let offs = 0
  for (let day = 1; day <= days; day += 1) {
    if (getDay(new Date(year, monthIndex, day)) === offDay) offs += 1
  }
  return days - offs || WAGE_DAYS_PER_MONTH
}

/**
 * The working days a month's wage is spread over. A Fixed type with a figure
 * typed uses that figure; a Fixed type left empty — and Automatic — use the
 * calendar's working days for the applicable month, which is what the API does
 * with `working_days: null`. Always a positive number, so a per-day figure
 * divided by it is never `NaN` or `Infinity`.
 */
export function resolveWorkingDays(
  row: {
    workingDayCalculationType?: string
    workingDays?: string
    weeklyOff?: string
  },
  month?: string,
): number {
  if (row.workingDayCalculationType === 'Fixed') {
    const fixed = toOptionalAmount(row.workingDays)
    if (
      fixed !== null &&
      Number.isInteger(fixed) &&
      fixed >= WORKING_DAYS_MIN &&
      fixed <= WORKING_DAYS_MAX
    ) {
      return fixed
    }
    return calendarWorkingDays(month)
  }
  return calendarWorkingDays(month, row.weeklyOff)
}

/**
 * Wage for a single day — the monthly basic spread over the month's working
 * days (see `resolveWorkingDays`). Derived, never captured: the form shows it
 * read-only.
 */
export function calculateWagePerDay(
  basicPay: string | number,
  workingDays: number = WAGE_DAYS_PER_MONTH,
): number {
  const basic = typeof basicPay === 'number' ? basicPay : toAmount(basicPay)
  return basic / (workingDays > 0 ? workingDays : WAGE_DAYS_PER_MONTH)
}

/**
 * Overtime rate for one hour, as the designation form arrives at it. A rate typed
 * into the form is the rate paid; left blank it comes off the wage per day at
 * double time, matching what the form's formula strip describes.
 *
 * The form asks for the rate alone rather than for how to arrive at it, because
 * the API stores the rate alone — it has no field for the method — so a derived
 * rate is computed here and sent as a plain figure either way.
 */
export function deriveDesignationOvertimeRate(
  values: Pick<
    DesignationFormValues,
    | 'basicPay'
    | 'overtimeApplicable'
    | 'overtimeRatePerHour'
    | 'workingDayCalculationType'
    | 'workingDays'
    | 'weeklyOff'
  >,
): number | null {
  if (!values.overtimeApplicable) return null

  const entered = toOptionalAmount(values.overtimeRatePerHour)
  if (entered !== null) return entered

  const basic = toOptionalAmount(values.basicPay)
  if (basic === null) return null
  return (calculateWagePerDay(basic, resolveWorkingDays(values)) / HOURS_PER_DAY) * 2
}
