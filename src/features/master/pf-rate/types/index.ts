import type { AuditFields } from '@/types/audit'

/**
 * A PF (Provident Fund) rate slab. Rates are versioned by their effective date
 * (`wef`) — a new record supersedes the previous one from that date onward, and
 * old records stay as history rather than being overwritten.
 */
export interface PfRate extends AuditFields {
  id: number
  /** With Effect From — `yyyy-MM-dd`. Unique across the master. */
  wef: string
  /** Amounts (INR). */
  wageCeilingLimit: number
  edliWageCeilingLimit: number
  minimumAdminCharges: number
  maximumEdliCharges: number
  minimumClosedAdminCharges: number
  minimumEdliClosedCharges: number
  /** Percentages (0–100). */
  employeePfContribution: number
  employerPfContribution: number
  employerFpfContribution: number
  deduction: number
  adminCharges: number
  edliCharges: number
  edliAdminCharges: number
  /** Age in years at which pension fund contribution stops. */
  pensionFundAgeLimit: number
}

/** The numeric keys of a slab — everything except its identity and date. */
export type PfRateValueKey = Exclude<keyof PfRate, 'id' | 'wef' | keyof AuditFields>

/** How a value column is labelled and rendered (see `PF_RATE_VALUE_FIELDS`). */
export interface PfRateValueField {
  key: PfRateValueKey
  /** Column header on the list + history tables. */
  title: string
  /** Full label used on the form, including its unit suffix. */
  label: string
  kind: 'amount' | 'percent' | 'age'
}
