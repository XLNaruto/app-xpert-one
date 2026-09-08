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
  /**
   * How both ESIC contributions are rounded.
   *
   * A **filing convention**, not arithmetic: it changes by notification, which is
   * why it rides on the effective-dated rate row rather than living in the pay
   * engine. `CEIL` was the engine's unconditional behaviour and stays the default
   * — it turns ₹104.2275 into ₹105, where a government-approved agency sheet
   * states ₹104.23, which is what `PAISE` gives.
   *
   * Whatever is set here is what the salary register applies, on both the
   * employee's and the employer's share.
   */
  roundingMode: EsicRoundingMode
}

/** `CEIL` rounds up, `ROUND` to the nearest rupee, `PAISE` to two decimals. */
export type EsicRoundingMode = 'CEIL' | 'ROUND' | 'PAISE'

/** The numeric keys of a slab — everything except identity, date and periods. */
export type EsicRateValueKey = Exclude<
  keyof EsicRate,
  | 'id'
  | 'wef'
  | 'contributionEndPeriod1'
  | 'contributionEndPeriod2'
  | 'roundingMode'
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
