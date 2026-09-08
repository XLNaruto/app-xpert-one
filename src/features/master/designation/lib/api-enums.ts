import type {
  ActAmountType,
  AllowanceValueType,
  PfDeductionType,
  WageEsicDeductionBasis,
  WageSalaryType,
  WorkingDayCalculationType,
} from '../types'
import type { WageStructurePayload } from '../schemas'

/**
 * The API and the screens name the same choices differently, so every enum
 * crosses here and nowhere else.
 *
 * - salary type — `MONTHLY` / `DAILY` on the wire; the designation form's
 *   dropdown says `Fix` for a monthly wage and the wage grid says `Monthly`.
 * - working days — `FIXED` pins the paid days, `AUTO` derives them.
 * - PT / LWF type — `FIXED` is a hand-entered amount, `AUTO` follows the act.
 *
 * A value the API sends that we don't recognise falls back to the safer answer
 * rather than throwing: a screen that renders is worth more than one that dies
 * on a choice added server-side.
 */

/* ── Salary type ────────────────────────────────────────────────────────── */

/** The designation form's `salaryType` (`Daily` / `Fix`) → the wire. */
export function toApiSalaryType(value: string): 'DAILY' | 'MONTHLY' {
  return value === 'Daily' ? 'DAILY' : 'MONTHLY'
}

/** The wire → the designation form's `salaryType`. */
export function fromApiSalaryType(value: string): string {
  return value.toUpperCase() === 'DAILY' ? 'Daily' : 'Fix'
}

/** The wage grid's `salaryType` (`Daily` / `Monthly`) → the wire. */
export function toApiWageSalaryType(value: WageSalaryType): 'DAILY' | 'MONTHLY' {
  return value === 'Daily' ? 'DAILY' : 'MONTHLY'
}

/** The wire → the wage grid's `salaryType`. */
export function fromApiWageSalaryType(value: string): WageSalaryType {
  return value.toUpperCase() === 'DAILY' ? 'Daily' : 'Monthly'
}

/* ── Working days ───────────────────────────────────────────────────────── */

export function toApiWorkingDayCalculationType(value: string): 'AUTO' | 'FIXED' {
  return value === 'Fixed' ? 'FIXED' : 'AUTO'
}

export function fromApiWorkingDayCalculationType(
  value: string | null,
): WorkingDayCalculationType | null {
  if (!value) return null
  return value.toUpperCase() === 'FIXED' ? 'Fixed' : 'As Per Calculation'
}

/* ── PT / LWF amount type ───────────────────────────────────────────────── */

export function toApiActAmountType(value: string): 'AUTO' | 'FIXED' {
  return value === 'Manual' ? 'FIXED' : 'AUTO'
}

export function fromApiActAmountType(value: string | null): ActAmountType | null {
  if (!value) return null
  return value.toUpperCase() === 'FIXED' ? 'Manual' : 'As Per Act'
}

/* ── The choices that travel unchanged ──────────────────────────────────── */

/**
 * A head's `amount_type` — spelled the same on both sides, and now four answers
 * rather than two: `Per Day` is a rupee rate per payable day and `Days` is a
 * count of days at the day's wage. Anything unrecognised reads as a percentage,
 * the form's own default.
 */
export function toValueType(value: string): AllowanceValueType {
  return ALLOWANCE_VALUE_TYPES.find((type) => type === value) ?? 'Percentage'
}

/** The four `amount_type` answers, in the order the unit toggle cycles them. */
export const ALLOWANCE_VALUE_TYPES: readonly AllowanceValueType[] = [
  'Percentage',
  'Fixed',
  'Per Day',
  'Days',
] as const

/**
 * The PF share's own unit, which stayed a pair — a flat rupee deduction or a
 * percentage of the EPF wages. The day-based types are a head's rule, not an
 * act's, so anything else here reads as a percentage.
 */
export function toPfDeductionType(value: string): PfDeductionType {
  return value === 'Fixed' ? 'Fixed' : 'Percentage'
}

/**
 * ESIC's deduction basis is spelled the same too, but only three answers are
 * accepted — anything else (a blank dropdown included) is sent as `null`, which
 * leaves the basis unrecorded rather than rejected.
 */
export function toApiEsicBasis(
  value: string,
): NonNullable<WageStructurePayload['esic_deduction_basis']> | null {
  const accepted: WageEsicDeductionBasis[] = [
    'Wage Ceiling',
    'Gross Salary',
    'As Per Act',
  ]
  return accepted.find((basis) => basis === value) ?? null
}

/** The wire → the grid's ESIC basis; anything unrecognised reads as unset. */
export function fromApiEsicBasis(value: string | null): WageEsicDeductionBasis | null {
  return value ? toApiEsicBasis(value) : null
}

/**
 * The weekly off answers the API accepts. "None" is one of them, so an explicit
 * "no weekly off" is stored rather than dropped; a blank dropdown is `null`.
 */
const WEEKLY_OFF_VALUES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Rotation',
  'None',
] as const

export function toApiWeeklyOff(value: string | null): string | null {
  if (!value) return null
  return WEEKLY_OFF_VALUES.find((day) => day === value) ?? null
}
