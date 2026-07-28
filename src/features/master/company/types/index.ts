import type { AuditFields } from '@/types/audit'

/**
 * A company master record as consumed by the UI (camelCase). Optional fields
 * are `null` when not recorded. Mapped from the raw company API response once
 * the backend lands.
 */
export interface Company extends AuditFields {
  id: number
  companyName: string
  companyCode: string
  /** Four-digit year the company was established, e.g. "2015". */
  establishYear: string
  registrationNumber: string | null
  panNumber: string
  gstNumber: string | null
  addressLine1: string
  addressLine2: string | null
  addressLine3: string | null
  state: string
  /** Parent district name (from the district master); `null` when not recorded. */
  district: string | null
  city: string | null
  pinCode: string | null
  phone: string | null
  mobile1: string
  mobile2: string | null
  email: string
}
