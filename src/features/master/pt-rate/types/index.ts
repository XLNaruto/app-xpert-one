import type { AuditFields } from '@/types/audit'

/**
 * One salary band inside a PT rate. Professional Tax is a flat amount per
 * salary band rather than a percentage, and a band can be narrowed further by
 * the month it applies in, the employee's gender and a minimum age.
 */
export interface PtRateSlab {
  /** Lower bound of the band (INR), inclusive. */
  minSalary: number
  /** Upper bound (INR), inclusive. `null` means the band is open-ended ("Above"). */
  maxSalary: number | null
  /** Flat PT amount deducted for this band (INR). */
  amount: number
  /** `'0'` = every month, otherwise `'01'`–`'12'`. */
  month: string
  gender: PtGender
  /** Minimum age the band applies from, or `null` when age doesn't matter. */
  minAge: number | null
}

export type PtGender = 'Male' | 'Female' | 'Both'

/**
 * A PT (Professional Tax) rate. Rates are per state and versioned by their
 * effective date (`wef`) — a new record supersedes the previous one for that
 * state from that date onward, and old records stay as history.
 */
export interface PtRate extends AuditFields {
  id: number
  /** With Effect From — `yyyy-MM-dd`. Unique per state. */
  wef: string
  stateId: number
  /** Denormalised for display so list rows don't have to join the state master. */
  stateName: string
  /** Free-text note about this revision. */
  detail: string
  slabs: PtRateSlab[]
}
