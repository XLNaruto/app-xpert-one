import type { AuditFields } from '@/types/audit'

/**
 * An LWF office address — the Labour Welfare Board office an establishment
 * files its contributions with. Held in the master so branches can point at an
 * office instead of retyping its address.
 */
export interface LwfOfficeAddress extends AuditFields {
  id: number
  officeName: string
  /** The LWF office code; optional, blank when the office has none on record. */
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
