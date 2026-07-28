import type { AuditFields } from '@/types/audit'

/**
 * An LWF (Labour Welfare Fund) rate. LWF is a flat contribution set by each
 * state and collected in specific months, so a rate is keyed by state and
 * versioned by its effective date (`wef`) — a new record supersedes the
 * previous one from that date onward and old records stay as history.
 */
export interface LwfRate extends AuditFields {
  id: number
  /** With Effect From — `yyyy-MM-dd`. Unique per state + month. */
  wef: string
  stateId: number
  /** Denormalised for display so list rows don't have to join the state master. */
  stateName: string
  /** `'0'` = collected every month, otherwise `'01'`–`'12'`. */
  month: string
  /** Flat amount deducted from the employee (INR). */
  employeeContribution: number
  /** Flat amount the employer adds (INR). */
  employerContribution: number
}
