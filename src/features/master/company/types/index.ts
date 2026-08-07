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
   * Hours one shift may run before an unclosed check-in counts as abandoned —
   * the site-wide policy, which a department may override for its own staff.
   * '' when unset, and the API then applies its default of 18.
   */
  shiftHours: string
}
