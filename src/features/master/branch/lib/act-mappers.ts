import { EMPTY_BRANCH_ACTS_FORM } from '../constants'
import type {
  ActRegistrationResponse,
  ActRegistrationUpdatePayload,
  BranchFormValues,
} from '../schemas'
import type { BranchActs } from '../types'

/** The acts half of the branch form. */
export type BranchActsFormValues = typeof EMPTY_BRANCH_ACTS_FORM

/** Trimmed value, or `null` when blank — how the API stores "not recorded". */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** An id-string from a combobox as the API wants it: a number, or `null`. */
function idOrNull(value: string): number | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : Number(trimmed)
}

/** A whole-number field as the API wants it. Blank means "not recorded". */
function numberOrNull(value: string): number | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : Number(trimmed)
}

/** A stored value as the form holds it — everything is a string on screen. */
function asField(value: string | number | null): string {
  return value === null ? '' : String(value)
}

/** API record → the UI acts. */
export function toBranchActs(response: ActRegistrationResponse): BranchActs {
  return {
    id: response.id,
    branchId: response.branch_id,

    pfCode: response.pf_code,
    epfActDate: response.epf_act_date,
    fpfActDate: response.fpf_act_date,
    pfStateId: response.pf_state_id,
    pfDistrictId: response.pf_district_id,
    pfOfficeAddressId: response.pf_office_address_id,
    pfUsername: response.pf_username,
    pfPassword: response.pf_password,

    esicCode: response.esic_code,
    esicDeductsOn: response.esic_deducts_on,
    esicRegistrationDate: response.esic_registration_date,
    esicStateId: response.esic_state_id,
    esicDistrictId: response.esic_district_id,
    esicOfficeAddressId: response.esic_office_address_id,
    esicUsername: response.esic_username,
    esicPassword: response.esic_password,

    factoryActDate: response.factory_act_date,
    factoryLicenseNumber: response.factory_license_number,
    factoryFinNumber: response.factory_fin_number,
    noOfEmployees: response.no_of_employees,
    electricHorsePower: response.electric_horse_power,
    licenseExpiryDate: response.license_expiry_date,
    stabilityExpiryDate: response.stability_expiry_date,
    factoryOfficeAddressId: response.factory_office_address_id,

    ptRegistrationDate: response.pt_registration_date,
    ptPecRegistrationNumber: response.pt_pec_registration_number,
    ptPrcRegistrationNumber: response.pt_prc_registration_number,
    ptCorporationName: response.pt_corporation_name,
    ptStateId: response.pt_state_id,
    ptDistrictId: response.pt_district_id,

    lwfRegistrationDate: response.lwf_registration_date,
    lwfRegistrationNumber: response.lwf_registration_number,
    lwfOfficeAddressId: response.lwf_office_address_id,
    lwfUsername: response.lwf_username,
    lwfPassword: response.lwf_password,

    exRegistrationDate: response.ex_registration_date,
    exRegistrationNumber: response.ex_registration_number,
    exOfficeAddressId: response.ex_office_address_id,
  }
}

/**
 * Validated form values → the act-registration body shared by create and
 * update. Every column is sent, `null` where the field was left blank: the tab
 * always submits whole, and on PATCH an omitted key means "leave alone" — only
 * an explicit `null` clears what the user emptied out.
 */
export function actsToPayload(values: BranchFormValues): ActRegistrationUpdatePayload {
  return {
    pf_code: orNull(values.pfCode),
    epf_act_date: orNull(values.epfActDate),
    fpf_act_date: orNull(values.fpfActDate),
    pf_office_address_id: idOrNull(values.pfOfficeAddressId),
    pf_username: orNull(values.pfUsername),
    pf_password: orNull(values.pfPassword),

    esic_code: orNull(values.esicCode),
    esic_deducts_on: orNull(values.esicDeductsOn),
    esic_registration_date: orNull(values.esicRegistrationDate),
    esic_office_address_id: idOrNull(values.esicOfficeAddressId),
    esic_username: orNull(values.esicUsername),
    esic_password: orNull(values.esicPassword),

    factory_act_date: orNull(values.factoryActDate),
    factory_license_number: orNull(values.factoryLicenseNumber),
    factory_fin_number: orNull(values.factoryFinNumber),
    no_of_employees: numberOrNull(values.noOfEmployees),
    electric_horse_power: numberOrNull(values.electricHorsePower),
    license_expiry_date: orNull(values.licenseExpiryDate),
    stability_expiry_date: orNull(values.stabilityExpiryDate),
    factory_office_address_id: idOrNull(values.factoryOfficeAddressId),

    pt_registration_date: orNull(values.ptRegistrationDate),
    pt_pec_registration_number: orNull(values.ptPecRegistrationNumber),
    pt_prc_registration_number: orNull(values.ptPrcRegistrationNumber),
    pt_corporation_name: orNull(values.ptCorporationName),
    pt_state_id: idOrNull(values.ptStateId),
    pt_district_id: idOrNull(values.ptDistrictId),

    lwf_registration_date: orNull(values.lwfRegistrationDate),
    lwf_registration_number: orNull(values.lwfRegistrationNumber),
    lwf_office_address_id: idOrNull(values.lwfOfficeAddressId),
    lwf_username: orNull(values.lwfUsername),
    lwf_password: orNull(values.lwfPassword),

    ex_registration_date: orNull(values.exRegistrationDate),
    ex_registration_number: orNull(values.exRegistrationNumber),
    ex_office_address_id: idOrNull(values.exOfficeAddressId),
  }
}

/** Hydrate the acts tab from a stored act-registration row. */
export function actsToFormValues(acts: BranchActs): BranchActsFormValues {
  return {
    pfCode: asField(acts.pfCode),
    epfActDate: asField(acts.epfActDate),
    fpfActDate: asField(acts.fpfActDate),
    pfOfficeAddressId: asField(acts.pfOfficeAddressId),
    pfUsername: asField(acts.pfUsername),
    pfPassword: asField(acts.pfPassword),

    esicCode: asField(acts.esicCode),
    esicDeductsOn: asField(acts.esicDeductsOn),
    esicRegistrationDate: asField(acts.esicRegistrationDate),
    esicOfficeAddressId: asField(acts.esicOfficeAddressId),
    esicUsername: asField(acts.esicUsername),
    esicPassword: asField(acts.esicPassword),

    factoryActDate: asField(acts.factoryActDate),
    factoryLicenseNumber: asField(acts.factoryLicenseNumber),
    factoryFinNumber: asField(acts.factoryFinNumber),
    noOfEmployees: asField(acts.noOfEmployees),
    electricHorsePower: asField(acts.electricHorsePower),
    licenseExpiryDate: asField(acts.licenseExpiryDate),
    stabilityExpiryDate: asField(acts.stabilityExpiryDate),
    factoryOfficeAddressId: asField(acts.factoryOfficeAddressId),

    ptRegistrationDate: asField(acts.ptRegistrationDate),
    ptPecRegistrationNumber: asField(acts.ptPecRegistrationNumber),
    ptPrcRegistrationNumber: asField(acts.ptPrcRegistrationNumber),
    ptCorporationName: asField(acts.ptCorporationName),
    ptStateId: asField(acts.ptStateId),
    ptDistrictId: asField(acts.ptDistrictId),

    lwfRegistrationDate: asField(acts.lwfRegistrationDate),
    lwfRegistrationNumber: asField(acts.lwfRegistrationNumber),
    lwfOfficeAddressId: asField(acts.lwfOfficeAddressId),
    lwfUsername: asField(acts.lwfUsername),
    lwfPassword: asField(acts.lwfPassword),

    exRegistrationDate: asField(acts.exRegistrationDate),
    exRegistrationNumber: asField(acts.exRegistrationNumber),
    exOfficeAddressId: asField(acts.exOfficeAddressId),
  }
}

/**
 * Whether the tab holds anything worth saving. A branch that isn't registered
 * under any act shouldn't get an all-null row on create — the POST is skipped
 * and the row is written the first time something is filled in.
 */
export function hasAnyAct(values: BranchFormValues): boolean {
  const payload = actsToPayload(values)
  return Object.values(payload).some((value) => value !== null)
}
