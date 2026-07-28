import type { AuditFields } from '@/types/audit'

/**
 * A factory statutory office address — the factory inspectorate a plant is
 * registered with. Held in the master so branches can point at an office
 * instead of retyping its address.
 */
export interface FactoryOfficeAddress extends AuditFields {
  id: number
  officeName: string
  /** The Factory inspectorate office code; optional, blank when the office has none on record. */
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
