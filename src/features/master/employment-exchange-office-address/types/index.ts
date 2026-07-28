import type { AuditFields } from '@/types/audit'

/**
 * An employment exchange office address — the district employment exchange an
 * establishment files its returns with. Held in the master so branches can
 * point at an office instead of retyping its address.
 */
export interface EmploymentExchangeOfficeAddress extends AuditFields {
  id: number
  officeName: string
  /** The employment exchange office code; optional, blank when none on record. */
  officeCode: string
  mobile: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  /** State name, matching the state master. */
  state: string
  /** District name, matching the district master. */
  district: string
  city: string
  pinCode: string
}
