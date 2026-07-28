import type { AuditFields } from '@/types/audit'

/**
 * A branch master record as consumed by the UI (camelCase). Only the branch
 * name and first address line are mandatory; every other field is `null` when
 * not recorded. Dates are ISO `yyyy-MM-dd` strings.
 */
export interface Branch extends AuditFields {
  id: number

  // Branch information
  branchName: string

  // Address details
  addressLine1: string
  addressLine2: string | null
  addressLine3: string | null
  state: string | null
  /** Parent district name (from the district master). */
  district: string | null
  city: string | null
  pinCode: string | null

  // PF act
  pfCode: string | null
  epfActDate: string | null
  fpfActDate: string | null
  pfState: string | null
  pfDistrict: string | null
  pfOfficeAddress: string | null
  pfUsername: string | null
  pfPassword: string | null

  // ESIC act
  esicCode: string | null
  esicDeductsOn: string | null
  esicRegistrationDate: string | null
  esicState: string | null
  esicDistrict: string | null
  esicOfficeAddress: string | null
  esicUsername: string | null
  esicPassword: string | null

  // Factory act
  factoryActDate: string | null
  factoryLicenseNumber: string | null
  factoryFinNumber: string | null
  employeeCount: string | null
  electricHorsePower: string | null
  licenseExpiryDate: string | null
  stabilityExpiryDate: string | null

  // Professional tax act
  ptRegistrationDate: string | null
  pecRegistrationNumber: string | null
  prcRegistrationNumber: string | null
  corporationName: string | null

  // LWF act
  lwfRegistrationDate: string | null
  lwfRegistrationNumber: string | null
  lwfOfficeAddressId: string | null
  lwfUsername: string | null
  lwfPassword: string | null

  // Employment exchange act
  eeRegistrationDate: string | null
  eeRegistrationNumber: string | null

}
