import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  EmployeeBasicFormValues,
  EmployeeBasicUpdatePayload,
  EmployeeResponse,
} from '../schemas'
import type { Employee, EmployeeCompletedSteps, EmployeeService } from '../types'
import { toApiDate, toFormDate } from './employee-dates'

/**
 * Step 1 — the person and their current posting.
 *
 * `prefix`, `code` and `nationality` come back on reads but aren't in the write
 * body (`additionalProperties: false` would reject them), so they're mapped in
 * one direction only: shown, never sent.
 */

/** Trimmed value, or `null` when blank — how the API stores "not recorded". */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** An id held as a form string → the number the API wants, or `null` if unset. */
function idOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/** Nothing saved yet — every step still open. */
const NO_STEPS_COMPLETED: EmployeeCompletedSteps = {
  basicDetail: false,
  kycDetail: false,
  wageStructure: false,
  familyDetail: false,
  educationDetail: false,
  documents: false,
  assets: false,
}

function toCompletedSteps(
  response: EmployeeResponse['completed_steps'],
): EmployeeCompletedSteps {
  if (!response) return NO_STEPS_COMPLETED
  return {
    basicDetail: response.basic_detail,
    kycDetail: response.kyc_detail,
    wageStructure: response.wage_structure,
    familyDetail: response.family_detail,
    educationDetail: response.education_detail,
    documents: response.documents,
    assets: response.assets,
  }
}

function toService(response: EmployeeResponse['service']): EmployeeService | null {
  if (!response) return null
  return {
    id: response.id,
    branchId: response.branch_id ?? null,
    departmentId: response.department_id ?? null,
    designationId: response.designation_id ?? null,
    grade: response.grade ?? '',
    employmentType: response.employment_type ?? '',
    contractPeriod: response.contract_period ?? null,
    contractPeriodType: response.contract_period_type ?? '',
    joiningDate: response.joining_date ?? '',
    confirmationDate: response.confirmation_date ?? '',
    renewalDate: response.renewal_date ?? '',
    leavingDate: response.leaving_date ?? '',
    leavingReason: response.leaving_reason ?? '',
  }
}

/**
 * API record → the UI employee. Every nullable column reads as an empty string,
 * so a screen renders a blank rather than the word "null", and a list row — which
 * carries no `service` — comes through with `service: null`.
 */
export function toEmployee(response: EmployeeResponse): Employee {
  return {
    id: response.id,
    companyId: response.company_id,
    code: response.code ?? '',
    prefix: response.prefix ?? '',
    name: response.name ?? '',
    photo: response.photo ?? '',
    gender: response.gender ?? '',
    birthDate: response.birth_date ?? '',
    maritalStatus: response.marital_status ?? '',
    relation: response.relation ?? '',
    relativeName: response.relative_name ?? '',

    currentAddress1: response.current_address1 ?? '',
    currentAddress2: response.current_address2 ?? '',
    currentAddress3: response.current_address3 ?? '',
    currentCountry: response.current_country ?? '',
    currentStateId: response.current_state_id ?? null,
    currentDistrictId: response.current_district_id ?? null,
    currentTaluka: response.current_taluka ?? '',
    currentCity: response.current_city ?? '',
    currentPinCode: response.current_pin_code ?? '',

    permanentAddress1: response.permanent_address1 ?? '',
    permanentAddress2: response.permanent_address2 ?? '',
    permanentAddress3: response.permanent_address3 ?? '',
    permanentCountry: response.permanent_country ?? '',
    permanentStateId: response.permanent_state_id ?? null,
    permanentDistrictId: response.permanent_district_id ?? null,
    permanentTaluka: response.permanent_taluka ?? '',
    permanentCity: response.permanent_city ?? '',
    permanentPinCode: response.permanent_pin_code ?? '',

    nationality: response.nationality ?? '',
    mobileNumber1: response.mobile_number1 ?? '',
    mobileNumber2: response.mobile_number2 ?? '',
    landlineNumber: response.landline_number ?? '',
    email: response.email ?? '',

    bloodGroup: response.blood_group ?? '',
    height: response.height ?? '',
    heightUnit: response.height_unit ?? '',
    weight: response.weight ?? '',
    weightUnit: response.weight_unit ?? '',
    isDisability: response.is_disability ?? false,
    remarks: response.remarks ?? '',
    isPoliceVerified: response.is_police_verified ?? false,
    isStampAgreement: response.is_stamp_agreement ?? false,

    completedSteps: toCompletedSteps(response.completed_steps),
    service: toService(response.service),

    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the body shared by create and edit. The create call
 * adds `company_id` on top; an edit can't move an employee between tenants, so
 * the update body stops here.
 *
 * `sameAsCurrent` is deliberately absent: it's a UI convenience, and the copied
 * values are what actually gets stored (the form hook keeps the two blocks in
 * step while the switch is on).
 */
export function employeeBasicToPayload(
  values: EmployeeBasicFormValues,
): EmployeeBasicUpdatePayload {
  return {
    name: orNull(values.name),
    photo: orNull(values.photo),
    gender: orNull(values.gender),
    birth_date: toApiDate(values.birthDate),
    marital_status: orNull(values.maritalStatus),
    relation: orNull(values.relation),
    relative_name: orNull(values.relativeName),

    current_address1: orNull(values.currentAddress1),
    current_address2: orNull(values.currentAddress2),
    current_address3: orNull(values.currentAddress3),
    current_country: orNull(values.currentCountry),
    current_state_id: idOrNull(values.currentStateId),
    current_district_id: idOrNull(values.currentDistrictId),
    current_taluka: orNull(values.currentTaluka),
    current_city: orNull(values.currentCity),
    current_pin_code: orNull(values.currentPinCode),

    permanent_address1: orNull(values.permanentAddress1),
    permanent_address2: orNull(values.permanentAddress2),
    permanent_address3: orNull(values.permanentAddress3),
    permanent_country: orNull(values.permanentCountry),
    permanent_state_id: idOrNull(values.permanentStateId),
    permanent_district_id: idOrNull(values.permanentDistrictId),
    permanent_taluka: orNull(values.permanentTaluka),
    permanent_city: orNull(values.permanentCity),
    permanent_pin_code: orNull(values.permanentPinCode),

    mobile_number1: orNull(values.mobileNumber1),
    mobile_number2: orNull(values.mobileNumber2),
    landline_number: orNull(values.landlineNumber),
    email: orNull(values.email.toLowerCase()),

    blood_group: orNull(values.bloodGroup),
    height: orNull(values.height),
    // The unit enum has no "unset" member, so it only travels with a value.
    height_unit: values.height.trim() ? orNull(values.heightUnit) : null,
    weight: orNull(values.weight),
    weight_unit: values.weight.trim() ? orNull(values.weightUnit) : null,
    is_disability: values.isDisability,
    remarks: orNull(values.remarks),

    branch_id: idOrNull(values.branchId),
    department_id: idOrNull(values.departmentId),
    designation_id: idOrNull(values.designationId),
    grade: orNull(values.grade),
    employment_type: orNull(values.employmentType),
    contract_period: idOrNull(values.contractPeriod),
    contract_period_type: values.contractPeriod.trim()
      ? orNull(values.contractPeriodType)
      : null,
    joining_date: toApiDate(values.joiningDate),
    confirmation_date: toApiDate(values.confirmationDate),
    renewal_date: toApiDate(values.renewalDate),
    is_police_verified: values.isPoliceVerified,
    is_stamp_agreement: values.isStampAgreement,
    leaving_date: toApiDate(values.leavingDate),
    leaving_reason: orNull(values.leavingReason),
  }
}

/**
 * Hydrate step 1's form from a stored employee.
 *
 * `sameAsCurrent` is inferred rather than stored: when the two address blocks
 * hold the same first line and PIN code they were almost certainly entered
 * through the switch, so the form reopens with it on and the permanent block
 * collapsed — which is what the user last saw.
 */
export function employeeToBasicFormValues(
  employee: Employee,
  blank: EmployeeBasicFormValues,
): EmployeeBasicFormValues {
  const service = employee.service

  const sameAsCurrent =
    employee.currentAddress1 !== '' &&
    employee.currentAddress1 === employee.permanentAddress1 &&
    employee.currentPinCode === employee.permanentPinCode

  return {
    photo: employee.photo,
    name: employee.name,
    gender: employee.gender,
    birthDate: toFormDate(employee.birthDate),
    maritalStatus: employee.maritalStatus,
    relation: employee.relation,
    relativeName: employee.relativeName,

    currentAddress1: employee.currentAddress1,
    currentAddress2: employee.currentAddress2,
    currentAddress3: employee.currentAddress3,
    currentCountry: employee.currentCountry || blank.currentCountry,
    currentStateId: employee.currentStateId === null ? '' : String(employee.currentStateId),
    currentDistrictId:
      employee.currentDistrictId === null ? '' : String(employee.currentDistrictId),
    currentTaluka: employee.currentTaluka,
    currentCity: employee.currentCity,
    currentPinCode: employee.currentPinCode,

    sameAsCurrent,
    permanentAddress1: employee.permanentAddress1,
    permanentAddress2: employee.permanentAddress2,
    permanentAddress3: employee.permanentAddress3,
    permanentCountry: employee.permanentCountry || blank.permanentCountry,
    permanentStateId:
      employee.permanentStateId === null ? '' : String(employee.permanentStateId),
    permanentDistrictId:
      employee.permanentDistrictId === null ? '' : String(employee.permanentDistrictId),
    permanentTaluka: employee.permanentTaluka,
    permanentCity: employee.permanentCity,
    permanentPinCode: employee.permanentPinCode,

    mobileNumber1: employee.mobileNumber1,
    mobileNumber2: employee.mobileNumber2,
    landlineNumber: employee.landlineNumber,
    email: employee.email,

    bloodGroup: employee.bloodGroup || blank.bloodGroup,
    height: employee.height,
    heightUnit: employee.heightUnit || blank.heightUnit,
    weight: employee.weight,
    weightUnit: employee.weightUnit || blank.weightUnit,
    isDisability: employee.isDisability,
    remarks: employee.remarks,

    branchId: service?.branchId != null ? String(service.branchId) : '',
    departmentId: service?.departmentId != null ? String(service.departmentId) : '',
    designationId: service?.designationId != null ? String(service.designationId) : '',
    grade: service?.grade ?? '',
    employmentType: service?.employmentType || blank.employmentType,
    contractPeriod: service?.contractPeriod != null ? String(service.contractPeriod) : '',
    contractPeriodType: service?.contractPeriodType || blank.contractPeriodType,
    joiningDate: toFormDate(service?.joiningDate),
    confirmationDate: toFormDate(service?.confirmationDate),
    renewalDate: toFormDate(service?.renewalDate),
    isPoliceVerified: employee.isPoliceVerified,
    isStampAgreement: employee.isStampAgreement,
    leavingDate: toFormDate(service?.leavingDate),
    leavingReason: service?.leavingReason ?? '',
  }
}

/**
 * Dropdown options for the pickers that point at an employee. The value is the
 * employee's **id**, and the label carries the code alongside the name — two
 * people share a name far more often than a code.
 */
export function employeeOptions(employees: Employee[]): ComboboxOption[] {
  return employees.map((employee) => ({
    label: employee.code ? `${employee.name} (${employee.code})` : employee.name,
    value: String(employee.id),
  }))
}

/** How many of the seven counted steps are done, and as a percentage. */
export function stepProgress(
  steps: EmployeeCompletedSteps,
  flags: readonly (keyof EmployeeCompletedSteps)[],
): { completed: number; total: number; percent: number } {
  const completed = flags.filter((flag) => steps[flag]).length
  return {
    completed,
    total: flags.length,
    percent: Math.round((completed / flags.length) * 100),
  }
}
