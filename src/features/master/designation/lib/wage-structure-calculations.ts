import { WAGE_DAYS_PER_MONTH } from '../constants'
import { toOptionalAmount } from './designation-calculations'
import type { WageStructureRow } from '../schemas'

/** Overtime hours in a working day — the divisor behind the derived OT rate. */
const HOURS_PER_DAY = 8

/**
 * The two wage figures a row carries — one captured, one derived, decided by the
 * salary type. A monthly wage is quoted as the basic and spread over the
 * statutory paid days; a daily wage is quoted per day and multiplied back up.
 * Either way the grid shows the derived side in a disabled field, so the two can
 * never disagree.
 */
export function deriveWages(
  row: Pick<WageStructureRow, 'salaryType' | 'basicPay' | 'wagePerDay'>,
): { basicPay: number | null; wagePerDay: number | null } {
  if (row.salaryType === 'Daily') {
    const perDay = toOptionalAmount(row.wagePerDay)
    return {
      basicPay: perDay === null ? null : perDay * WAGE_DAYS_PER_MONTH,
      wagePerDay: perDay,
    }
  }
  const basic = toOptionalAmount(row.basicPay)
  return {
    basicPay: basic,
    wagePerDay: basic === null ? null : basic / WAGE_DAYS_PER_MONTH,
  }
}

/**
 * Overtime rate for one hour. Entered by hand on "Manual"; on "Auto" it comes
 * off the wage per day at double time, matching how the designation form
 * describes the calculation.
 */
export function deriveOvertimeRate(
  row: Pick<
    WageStructureRow,
    | 'salaryType'
    | 'basicPay'
    | 'wagePerDay'
    | 'overtimeApplicable'
    | 'overtimeCalculationType'
    | 'overtimeRatePerHour'
  >,
): number | null {
  if (!row.overtimeApplicable) return null
  if (row.overtimeCalculationType === 'Manual') {
    return toOptionalAmount(row.overtimeRatePerHour)
  }
  const { wagePerDay } = deriveWages(row)
  if (wagePerDay === null) return null
  return (wagePerDay / HOURS_PER_DAY) * 2
}
