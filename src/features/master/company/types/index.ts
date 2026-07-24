/**
 * A company master record as consumed by the UI (camelCase). Optional fields
 * are `null` when not recorded. Mapped from the raw company API response once
 * the backend lands.
 */
export interface Company {
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
  city: string | null
  pinCode: string | null
  phone: string | null
  mobile1: string
  mobile2: string | null
  email: string
  /** ISO date-time the record was created. */
  createdAt: string
}
