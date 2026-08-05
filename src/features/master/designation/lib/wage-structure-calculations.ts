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
 * Overtime rate for one hour. A rate entered on the row is the rate paid; left
 * blank it comes off the row's wage per day at double time, which is also what
 * the cell shows as its placeholder — so the row never has to say which of the
 * two it means, and the stored figure is the same either way.
 */
export function deriveOvertimeRate(
  row: Pick<
    WageStructureRow,
    | 'salaryType'
    | 'basicPay'
    | 'wagePerDay'
    | 'overtimeApplicable'
    | 'overtimeRatePerHour'
  >,
): number | null {
  if (!row.overtimeApplicable) return null

  const entered = toOptionalAmount(row.overtimeRatePerHour)
  if (entered !== null) return entered

  const { wagePerDay } = deriveWages(row)
  if (wagePerDay === null) return null
  return (wagePerDay / HOURS_PER_DAY) * 2
}

/**
 * Two decimals at most, and none on a whole number.
 *
 * Every figure the wage grid prints goes through here, because most of them are
 * one division away from a repeating decimal — a monthly basic spread over the
 * paid days, an hourly rate off that again — and a cell is far too narrow to show
 * `144.23076923076923`. Two decimals is also all the API accepts back, so nothing
 * is lost by never showing more.
 */
export function gridAmount(value: number): number {
  return Math.round(value * 100) / 100
}
