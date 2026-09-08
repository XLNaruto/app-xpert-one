import type { AuditFields } from '@/types/audit'

/**
 * A company master record as consumed by the UI (camelCase), mapped from the
 * raw `/user/companies` response. Nullable API columns read as empty strings so
 * the screens can render them without a null check.
 *
 * The record references its state and district by id; the names alongside are
 * whatever the API resolved (or the edit form looked up), and read as a dash
 * when neither source has one.
 */
export interface Company extends AuditFields {
  id: number
  companyName: string
  /** Generated server-side — shown, never keyed in. */
  companyCode: string
  /** Four-digit year the company was established, e.g. "2015"; '' if unset. */
  establishYear: string
  logo: string
  registrationNumber: string
  panNumber: string
  gstNumber: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  stateId: number | null
  stateName: string
  districtId: number | null
  districtName: string
  city: string
  pinCode: string
  phone: string
  mobile1: string
  mobile2: string
  email: string
  /**
   * The billing charges in force, or `null` when the company has **never**
   * configured any — in which case it invoices at statutory cost. Null is "not
   * configured", not zero: the engine computes it as zero, but nobody set a rate.
   */
  billing: CompanyBilling | null
}

/**
 * One version of a company's billing charges — the two rates the
 * TOTAL_INVOICE_AMOUNT calculation base is priced on.
 *
 * A versioned row rather than columns on the company, so a month that has been
 * processed keeps the rates it was actually billed at. Either rate can be `null`
 * on its own, meaning that component invoices at cost.
 */
export interface CompanyBilling {
  /** `yyyy-MM-dd` — the day these rates took effect. */
  effectiveFrom: string
  agencyChargePercentage: number | null
  gstPercentage: number | null
}
