import type { AuditFields } from '@/types/audit'

/**
 * A branch master record as consumed by the UI (camelCase), mapped from the raw
 * `/user/branches` response. Nullable API columns read as empty strings so the
 * screens can render them without a null check.
 *
 * The record references its state and district by id; the names alongside are
 * whatever the API resolved, and read as a dash when it sent none.
 */
export interface Branch extends AuditFields {
  id: number
  /** The tenant the branch belongs to — the company the session has active. */
  companyId: number
  branchName: string
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
}

/**
 * A branch's applicable acts — PF, ESIC, Factory, Professional Tax, LWF and
 * Employment Exchange, mapped from `/user/act-registrations`.
 *
 * One row per branch, so `branchId` is the identity the screens read by. Every
 * field is optional: a branch registers only under the acts that apply to it,
 * and anything not on file is `null`. Dates are ISO `yyyy-MM-dd` strings.
 *
 * States, districts and offices are referenced **by id** — into the state and
 * district masters, and into `/user/office-addresses` filtered to the matching
 * `office_for`.
 */
export interface BranchActs {
  /** The act-registration row's own id — what a PATCH addresses. */
  id: number
  branchId: number

  // PF act
  pfCode: string | null
  epfActDate: string | null
  fpfActDate: string | null
  pfStateId: number | null
  pfDistrictId: number | null
  pfOfficeAddressId: number | null
  pfUsername: string | null
  pfPassword: string | null

  // ESIC act
  esicCode: string | null
  esicDeductsOn: string | null
  esicRegistrationDate: string | null
  esicStateId: number | null
  esicDistrictId: number | null
  esicOfficeAddressId: number | null
  esicUsername: string | null
  esicPassword: string | null

  // Factory act
  factoryActDate: string | null
  factoryLicenseNumber: string | null
  factoryFinNumber: string | null
  noOfEmployees: number | null
  electricHorsePower: number | null
  licenseExpiryDate: string | null
  stabilityExpiryDate: string | null
  factoryOfficeAddressId: number | null

  // Professional tax act
  ptRegistrationDate: string | null
  ptPecRegistrationNumber: string | null
  ptPrcRegistrationNumber: string | null
  ptCorporationName: string | null
  ptStateId: number | null
  ptDistrictId: number | null

  // LWF act
  lwfRegistrationDate: string | null
  lwfRegistrationNumber: string | null
  lwfOfficeAddressId: number | null
  lwfUsername: string | null
  lwfPassword: string | null

  // Employment exchange act
  exRegistrationDate: string | null
  exRegistrationNumber: string | null
  exOfficeAddressId: number | null
}
