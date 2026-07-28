import type { AuditFields } from '@/types/audit'

/**
 * An ESIC office address — the ESIC branch/regional office an establishment is
 * registered with. Held in the master so branches can point at an office
 * instead of retyping its address.
 */
export interface EsicOfficeAddress extends AuditFields {
  id: number
  officeName: string
  /** The ESIC office code; optional, blank when the office has none on record. */
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
