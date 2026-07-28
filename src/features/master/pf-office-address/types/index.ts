import type { AuditFields } from '@/types/audit'

/**
 * A PF office address — the EPFO regional/sub-regional office a branch is
 * registered with. Held in the master so branches can point at an office
 * instead of retyping its address.
 */
export interface PfOfficeAddress extends AuditFields {
  id: number
  officeName: string
  /** The EPFO office code, e.g. `GJ/SRT`. */
  officeCode: string
  /** `'Regional Office'` | `'Sub Regional Office'`; blank when not classified. */
  officeType: string
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
