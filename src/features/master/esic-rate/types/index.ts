import type { AuditFields } from '@/types/audit'

/**
 * An ESIC (Employees' State Insurance) rate slab. Like PF rates, slabs are
 * versioned by their effective date (`wef`) — a new record supersedes the
 * previous one from that date onward and old records stay as history.
 */
export interface EsicRate extends AuditFields {
  id: number
  /** With Effect From — `yyyy-MM-dd`. Unique across the master. */
  wef: string
  /** Amounts (INR). */
  wageCeilingLimit: number
  minimumRate: number
  disabilityWageLimit: number
  /** Percentages (0–100). */
  employeeEsiContribution: number
  employerEsiContribution: number
  /** Duration in years for which disability benefit applies. */
  disabilityDuration: number
  /**
   * Closing months of the two statutory contribution periods, as `01`–`12`
   * (conventionally September and March). Stored as strings because that's the
   * option value the dropdown and the API both use.
   */
  contributionEndPeriod1: string
  contributionEndPeriod2: string
}

/** The numeric keys of a slab — everything except identity, date and periods. */
export type EsicRateValueKey = Exclude<
  keyof EsicRate,
  | 'id'
  | 'wef'
  | 'contributionEndPeriod1'
  | 'contributionEndPeriod2'
  | keyof AuditFields
>

/** How a value column is labelled and rendered (see `ESIC_RATE_VALUE_FIELDS`). */
export interface EsicRateValueField {
  key: EsicRateValueKey
  /** Column header on the list + history tables. */
  title: string
  /** Full label used on the form, including its unit suffix. */
  label: string
  kind: 'amount' | 'percent' | 'duration'
}
