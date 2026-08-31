import type {
  EmployeeAssetFormValues,
  EmployeeAssetPayload,
  EmployeeAssetResponse,
  EmployeeDocumentFormValues,
  EmployeeDocumentPayload,
  EmployeeDocumentResponse,
  EmployeeEducationFormValues,
  EmployeeEducationPayload,
  EmployeeEducationResponse,
  EmployeeExperienceFormValues,
  EmployeeExperiencePayload,
  EmployeeExperienceResponse,
  EmployeeFamilyFormValues,
  EmployeeFamilyPayload,
  EmployeeFamilyResponse,
  EmployeeKycFormValues,
  EmployeeKycPayload,
  EmployeeKycResponse,
  EmployeeServiceEditFormValues,
  EmployeeServiceEditPayload,
  EmployeeTransferDetailResponse,
  EmployeeTransferFormValues,
  EmployeeTransferPayload,
  EmployeeTransferResponse,
  EmployeeWageComponentResponse,
  EmployeeWageStructureResponse,
  LeaveServiceFormValues,
  LeaveServicePayload,
} from '../schemas'
import type {
  EmployeeAsset,
  EmployeeDocument,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeFamilyMember,
  EmployeeKyc,
  EmployeeTransfer,
  EmployeeTransferDetail,
  EmployeeWageComponent,
  EmployeeWageStructure,
} from '../types'
import { PERMANENT_EMPLOYMENT_TYPE } from '../constants'
import { toApiDate, toFormDate, toFormMonth, toRequiredApiDate } from './employee-dates'

/**
 * Mappers for steps 2 through 9 — one pair per resource: the API record into the
 * UI type, and the validated form back into the request body.
 *
 * Every write body here is exactly what its endpoint accepts; none of them spread
 * form values, because all of these endpoints reject unknown keys.
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

/** The audit trail every collection row carries, with absent values as dashes. */
function auditOf(response: {
  created_at?: string | null
  created_by_name?: string | null
  updated_at?: string | null
  updated_by_name?: string | null
}) {
  return {
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/* ── Step 2 — KYC ────────────────────────────────────────────────────────── */

export function toEmployeeKyc(response: EmployeeKycResponse): EmployeeKyc {
  return {
    employeeId: response.employee_id,
    pfNumber: response.pf_number ?? '',
    uanNumber: response.uan_number ?? '',
    esicNumber: response.esic_number ?? '',
    bankId: response.bank_id ?? null,
    bankAccountNumber: response.bank_account_number ?? '',
    bankBranchName: response.bank_branch_name ?? '',
    ifscCode: response.ifsc_code ?? '',
    aadharNumber: response.aadhar_number ?? '',
    nameAsPerAadhar: response.name_as_per_aadhar ?? '',
    panNumber: response.pan_number ?? '',
    epicNumber: response.epic_number ?? '',
    rationCardNumber: response.ration_card_number ?? '',
    drivingLicenceNumber: response.driving_licence_number ?? '',
    drivingLicenceExpiryDate: response.driving_licence_expiry_date ?? '',
    passportNumber: response.passport_number ?? '',
    passportValidFrom: response.passport_valid_from ?? '',
    passportValidTo: response.passport_valid_to ?? '',
  }
}

export function kycToPayload(values: EmployeeKycFormValues): EmployeeKycPayload {
  return {
    pf_number: orNull(values.pfNumber),
    uan_number: orNull(values.uanNumber),
    esic_number: orNull(values.esicNumber),
    bank_id: idOrNull(values.bankId),
    bank_account_number: orNull(values.bankAccountNumber),
    bank_branch_name: orNull(values.bankBranchName),
    ifsc_code: orNull(values.ifscCode.toUpperCase()),
    aadhar_number: orNull(values.aadharNumber),
    name_as_per_aadhar: orNull(values.nameAsPerAadhar),
    pan_number: orNull(values.panNumber.toUpperCase()),
    epic_number: orNull(values.epicNumber.toUpperCase()),
    ration_card_number: orNull(values.rationCardNumber),
    driving_licence_number: orNull(values.drivingLicenceNumber.toUpperCase()),
    driving_licence_expiry_date: toApiDate(values.drivingLicenceExpiryDate),
    passport_number: orNull(values.passportNumber.toUpperCase()),
    passport_valid_from: toApiDate(values.passportValidFrom),
    passport_valid_to: toApiDate(values.passportValidTo),
  }
}

export function kycToFormValues(
  kyc: EmployeeKyc,
  blank: EmployeeKycFormValues,
): EmployeeKycFormValues {
  return {
    ...blank,
    pfNumber: kyc.pfNumber,
    uanNumber: kyc.uanNumber,
    esicNumber: kyc.esicNumber,
    bankId: kyc.bankId === null ? '' : String(kyc.bankId),
    bankAccountNumber: kyc.bankAccountNumber,
    bankBranchName: kyc.bankBranchName,
    ifscCode: kyc.ifscCode,
    aadharNumber: kyc.aadharNumber,
    nameAsPerAadhar: kyc.nameAsPerAadhar,
    panNumber: kyc.panNumber,
    epicNumber: kyc.epicNumber,
    rationCardNumber: kyc.rationCardNumber,
    drivingLicenceNumber: kyc.drivingLicenceNumber,
    drivingLicenceExpiryDate: toFormDate(kyc.drivingLicenceExpiryDate),
    passportNumber: kyc.passportNumber,
    passportValidFrom: toFormDate(kyc.passportValidFrom),
    passportValidTo: toFormDate(kyc.passportValidTo),
  }
}

/**
 * Has the KYC step ever been saved?
 *
 * There's no flag for it on the record — an untouched step reads back as a row of
 * nulls, not a 404 — so "empty" *is* the signal, and it's what picks POST (the
 * first save, a full overwrite) over PATCH.
 */
export function isKycEmpty(kyc: EmployeeKyc): boolean {
  return (
    kyc.bankId === null &&
    [
      kyc.pfNumber,
      kyc.uanNumber,
      kyc.esicNumber,
      kyc.bankAccountNumber,
      kyc.bankBranchName,
      kyc.ifscCode,
      kyc.aadharNumber,
      kyc.nameAsPerAadhar,
      kyc.panNumber,
      kyc.epicNumber,
      kyc.rationCardNumber,
      kyc.drivingLicenceNumber,
      kyc.drivingLicenceExpiryDate,
      kyc.passportNumber,
      kyc.passportValidFrom,
      kyc.passportValidTo,
    ].every((value) => value === '')
  )
}

/* ── Step 3 — the inherited wage structure ───────────────────────────────── */

export function toEmployeeWageStructure(
  response: EmployeeWageStructureResponse,
): EmployeeWageStructure {
  return {
    employeeId: response.employee_id,
    employeeServiceId: response.employee_service_id,
    designationId: response.designation_id ?? null,
    designationWageStructureId: response.designation_wage_structure_id ?? null,
    applicableDate: response.applicable_date ?? '',
    salaryType: response.salary_type ?? '',
    wagesPerDay: response.wages_per_day ?? null,
    basicPay: response.basic_pay ?? null,
    workingDayCalculationType: response.working_day_calculation_type ?? '',
    workingDays: response.working_days ?? null,
    extraDayAmountPerDay: response.extra_day_amount_per_day ?? null,
    weeklyOff: response.weekly_off ?? '',

    isPfActApplicable: response.is_pf_act_applicable ?? false,
    pfDeductionType: response.pf_deduction_type ?? '',
    pfDeductionAmount: response.pf_deduction_amount ?? null,
    isEmployeePfContributionOnWageLimit:
      response.is_employee_pf_contribution_on_wage_limit ?? false,
    isEmployerPfContributionOnWageLimit:
      response.is_employer_pf_contribution_on_wage_limit ?? false,

    isEsicActApplicable: response.is_esic_act_applicable ?? false,
    esicDeductionBasis: response.esic_deduction_basis ?? '',
    esicStartDate: response.esic_start_date ?? '',

    isPtActApplicable: response.is_pt_act_applicable ?? false,
    ptActType: response.pt_act_type ?? '',
    ptAmount: response.pt_amount ?? null,

    isLwfActApplicable: response.is_lwf_act_applicable ?? false,
    isLwfDeductFromWages: response.is_lwf_deduct_from_wages ?? false,
    lwfActType: response.lwf_act_type ?? '',
    lwfAmount: response.lwf_amount ?? null,

    isOvertimeApplicable: response.is_overtime_applicable ?? false,
    overtimeRatePerHour: response.overtime_rate_per_hour ?? null,
    isPfApplicableOnOvertime: response.is_pf_applicable_on_overtime ?? false,
    isEsicApplicableOnOvertime: response.is_esic_applicable_on_overtime ?? false,
    isPtApplicableOnOvertime: response.is_pt_applicable_on_overtime ?? false,

    isTdsActApplicable: response.is_tds_act_applicable ?? false,
    isDisability: response.is_disability ?? false,

    salaryComponents: (response.salary_components ?? []).map(toEmployeeWageComponent),
  }
}

/**
 * One allowance / deduction head as a wage carries it. Shared by the inherited
 * structure above and the employee's own wage read, which answer the same heads:
 * the catalog is the designation's either way.
 */
export function toEmployeeWageComponent(
  component: EmployeeWageComponentResponse,
): EmployeeWageComponent {
  return {
    payComponentId: component.pay_component_id,
    componentType: component.component_type ?? '',
    sortOrder: component.sort_order,
    amount: component.amount,
    amountType: component.amount_type,
    pfApplicable: component.pf_applicable ?? false,
    esicApplicable: component.esic_applicable ?? false,
    ptApplicable: component.pt_applicable ?? false,
  }
}

/* ── Step 4 — family ─────────────────────────────────────────────────────── */

export function toEmployeeFamilyMember(
  response: EmployeeFamilyResponse,
): EmployeeFamilyMember {
  return {
    id: response.id,
    employeeId: response.employee_id ?? 0,
    fullName: response.full_name ?? '',
    relation: response.relation ?? '',
    birthDate: response.birth_date ?? '',
    aadharNumber: response.aadhar_number ?? '',
    isNominee: response.is_nominee ?? false,
    ...auditOf(response),
  }
}

export function familyToPayload(
  values: EmployeeFamilyFormValues,
): EmployeeFamilyPayload {
  return {
    full_name: values.fullName.trim(),
    relation: orNull(values.relation),
    birth_date: toApiDate(values.birthDate),
    aadhar_number: orNull(values.aadharNumber),
    is_nominee: values.isNominee,
  }
}

export function familyToFormValues(
  member: EmployeeFamilyMember,
): EmployeeFamilyFormValues {
  return {
    fullName: member.fullName,
    relation: member.relation,
    birthDate: toFormDate(member.birthDate),
    aadharNumber: member.aadharNumber,
    isNominee: member.isNominee,
  }
}

/* ── Step 5a — education ─────────────────────────────────────────────────── */

export function toEmployeeEducation(
  response: EmployeeEducationResponse,
): EmployeeEducation {
  return {
    id: response.id,
    employeeId: response.employee_id ?? null,
    educationName: response.education_name ?? '',
    board: response.board ?? '',
    passingYear: response.passing_year ?? '',
    percentage: response.percentage ?? '',
    ...auditOf(response),
  }
}

export function educationToPayload(
  values: EmployeeEducationFormValues,
): EmployeeEducationPayload {
  return {
    education_name: values.educationName.trim(),
    passing_year: values.passingYear.trim(),
    board: orNull(values.board),
    percentage: orNull(values.percentage),
  }
}

export function educationToFormValues(
  education: EmployeeEducation,
): EmployeeEducationFormValues {
  return {
    educationName: education.educationName,
    board: education.board,
    passingYear: education.passingYear,
    percentage: education.percentage,
  }
}

/* ── Step 5b — experience ────────────────────────────────────────────────── */

export function toEmployeeExperience(
  response: EmployeeExperienceResponse,
): EmployeeExperience {
  return {
    id: response.id,
    employeeId: response.employee_id ?? null,
    companyName: response.company_name ?? '',
    fromDate: response.from_date ?? '',
    toDate: response.to_date ?? '',
    designation: response.designation ?? '',
    salary: response.salary ?? '',
    ctcType: response.ctc_type ?? null,
    leavingReason: response.leaving_reason ?? '',
    contactPersonName: response.contact_person_name ?? '',
    contactPersonNumber: response.contact_person_number ?? '',
    contactPersonEmail: response.contact_email ?? '',
    isVerified: response.is_verified ?? false,
    verifiedBy: response.verified_by ?? null,
    verifiedByName: response.verified_by_name ?? '',
    verificationReview: response.verification_review ?? '',
    ...auditOf(response),
  }
}

/**
 * Both dates go out as bare `YYYY-MM` — the endpoint rejects a full date.
 *
 * The verification block travels whole, and that is what makes the same body
 * correct for a POST and a PATCH: `is_verified: true` (re-)stamps the caller as the
 * verifier, and `is_verified: false` clears the verifier AND the review — which is
 * why the remark is forced to `null` there rather than sent as typed. Sending a
 * non-null remark alongside `false` is a 400, not a partial instruction.
 *
 * `verified_by` is never sent: the API stamps the logged-in user itself.
 */
export function experienceToPayload(
  values: EmployeeExperienceFormValues,
): EmployeeExperiencePayload {
  return {
    company_name: values.companyName.trim(),
    from_date: values.fromDate.trim(),
    to_date: values.toDate.trim(),
    designation: values.designation.trim(),
    salary: orNull(values.salary),
    ctc_type: values.ctcType === '' ? null : values.ctcType,
    leaving_reason: orNull(values.leavingReason),
    contact_person_name: orNull(values.contactPersonName),
    contact_person_number: orNull(values.contactPersonNumber),
    contact_email: orNull(values.contactPersonEmail),
    is_verified: values.isVerified,
    verification_review: values.isVerified ? orNull(values.verificationReview) : null,
  }
}

export function experienceToFormValues(
  experience: EmployeeExperience,
): EmployeeExperienceFormValues {
  return {
    companyName: experience.companyName,
    fromDate: toFormMonth(experience.fromDate),
    toDate: toFormMonth(experience.toDate),
    designation: experience.designation,
    salary: experience.salary,
    ctcType: experience.ctcType ?? '',
    leavingReason: experience.leavingReason,
    contactPersonName: experience.contactPersonName,
    contactPersonNumber: experience.contactPersonNumber,
    contactPersonEmail: experience.contactPersonEmail,
    isVerified: experience.isVerified,
    verificationReview: experience.verificationReview,
    verifiedByName: experience.verifiedByName,
  }
}

/* ── Step 6 — documents ──────────────────────────────────────────────────── */

export function toEmployeeDocument(
  response: EmployeeDocumentResponse,
): EmployeeDocument {
  return {
    id: response.id,
    employeeId: response.employee_id ?? null,
    documentTypeId: response.document_type_id ?? null,
    documentTypeName: response.document_type_name ?? '',
    documentId: response.document_id ?? null,
    documentName: response.document_name ?? '',
    expiryDate: response.expiry_date ?? '',
    document: response.document ?? '',
    ...auditOf(response),
  }
}

export function documentToPayload(
  values: EmployeeDocumentFormValues,
): EmployeeDocumentPayload {
  return {
    document_type_id: Number(values.documentTypeId),
    document_id: Number(values.documentId),
    document: values.document.trim(),
    expiry_date: toApiDate(values.expiryDate),
  }
}

export function documentToFormValues(
  document: EmployeeDocument,
): EmployeeDocumentFormValues {
  return {
    documentTypeId: document.documentTypeId === null ? '' : String(document.documentTypeId),
    documentId: document.documentId === null ? '' : String(document.documentId),
    expiryDate: toFormDate(document.expiryDate),
    document: document.document,
  }
}

/** Has this attachment's expiry passed? Undated documents never expire. */
export function isDocumentExpired(document: EmployeeDocument): boolean {
  if (!document.expiryDate) return false
  return toFormDate(document.expiryDate) < new Date().toISOString().slice(0, 10)
}

/* ── Step 7 — assets ─────────────────────────────────────────────────────── */

export function toEmployeeAsset(response: EmployeeAssetResponse): EmployeeAsset {
  return {
    id: response.id,
    employeeId: response.employee_id ?? null,
    assetId: response.asset_id ?? null,
    assetName: response.asset_name ?? '',
    variantId: response.variant_id ?? null,
    variantName: response.variant_name ?? '',
    stockHeld: response.stock_held ?? false,
    assignedDate: response.assigned_date ?? '',
    validTill: response.valid_till ?? '',
    status: response.status ?? '',
    remarks: response.remarks ?? '',
    ...auditOf(response),
  }
}

export function assetToPayload(values: EmployeeAssetFormValues): EmployeeAssetPayload {
  return {
    asset_id: Number(values.assetId),
    // `null` is meaningful on a PATCH — it detaches the variant and puts the
    // unit back on the shelf without deleting the handout.
    variant_id: idOrNull(values.variantId),
    status: values.status,
    assigned_date: toApiDate(values.assignedDate),
    valid_till: toApiDate(values.validTill),
    remarks: orNull(values.remarks),
  }
}

export function assetToFormValues(asset: EmployeeAsset): EmployeeAssetFormValues {
  return {
    assetId: asset.assetId === null ? '' : String(asset.assetId),
    variantId: asset.variantId === null ? '' : String(asset.variantId),
    // A first guess only — the row's variant query corrects it once it loads.
    hasVariants: asset.variantId !== null,
    status: asset.status || 'ASSIGNED',
    assignedDate: toFormDate(asset.assignedDate),
    validTill: toFormDate(asset.validTill),
    remarks: asset.remarks,
  }
}

/* ── Step 8 — transfers ──────────────────────────────────────────────────── */

export function toEmployeeTransfer(
  response: EmployeeTransferResponse,
): EmployeeTransfer {
  return {
    id: response.id,
    companyId: response.company_id,
    companyName: response.company_name ?? '',
    branchId: response.branch_id ?? null,
    branchName: response.branch_name ?? '',
    departmentId: response.department_id ?? null,
    departmentName: response.department_name ?? '',
    designationId: response.designation_id ?? null,
    designationName: response.designation_name ?? '',
    grade: response.grade ?? '',
    employmentType: response.employment_type ?? '',
    contractPeriod: response.contract_period ?? null,
    contractPeriodType: response.contract_period_type ?? '',
    joiningDate: response.joining_date ?? '',
    leavingDate: response.leaving_date ?? '',
    isCurrent: response.is_current ?? false,
    isLatest: response.is_latest ?? false,
    ...auditOf(response),
  }
}

export function toEmployeeTransferDetail(
  response: EmployeeTransferDetailResponse,
): EmployeeTransferDetail {
  const wage = response.wage_structure
  const service = response.service_detail

  return {
    wageStructure: {
      designationWageStructureId: wage.designation_wage_structure_id ?? null,
      salaryType: wage.salary_type ?? '',
      basicPay: wage.basic_pay ?? null,
      wagesPerDay: wage.wages_per_day ?? null,
      isPfActApplicable: wage.is_pf_act_applicable ?? false,
      isEsicActApplicable: wage.is_esic_act_applicable ?? false,
      isPtActApplicable: wage.is_pt_act_applicable ?? false,
      isLwfActApplicable: wage.is_lwf_act_applicable ?? false,
      isOvertimeApplicable: wage.is_overtime_applicable ?? false,
      isTdsActApplicable: wage.is_tds_act_applicable ?? false,
      weeklyOff: wage.weekly_off ?? '',
      isDisability: wage.is_disability ?? false,
    },
    serviceDetail: {
      id: service.id,
      companyId: service.company_id,
      companyName: service.company_name ?? '',
      branchId: service.branch_id ?? null,
      branchName: service.branch_name ?? '',
      departmentId: service.department_id ?? null,
      departmentName: service.department_name ?? '',
      designationId: service.designation_id ?? null,
      designationName: service.designation_name ?? '',
      grade: service.grade ?? '',
      employmentType: service.employment_type ?? '',
      contractPeriod: service.contract_period ?? null,
      contractPeriodType: service.contract_period_type ?? '',
      joiningDate: service.joining_date ?? '',
      confirmationDate: service.confirmation_date ?? '',
      renewalDate: service.renewal_date ?? '',
      leavingDate: service.leaving_date ?? '',
      leavingReason: service.leaving_reason ?? '',
      isCurrent: service.is_current ?? false,
      isLatest: service.is_latest ?? false,
      isPoliceVerified: service.is_police_verified ?? false,
      isStampAgreement: service.is_stamp_agreement ?? false,
    },
  }
}

/**
 * A transfer body. `new_company_id` travels only on a company change, and the
 * contract fields only on a contractual posting — a permanent one has no period
 * to renew, and the API would store a stray value.
 */
/**
 * The form asks for the destination company outright, so the API's
 * `transfer_type` is read off it: a company the employee isn't in today is a
 * company move, anything else is a move inside the one being left.
 */
export function transferToPayload(
  values: EmployeeTransferFormValues,
  currentCompanyId?: number,
): EmployeeTransferPayload {
  const isContractual = values.employmentType !== PERMANENT_EMPLOYMENT_TYPE
  const companyId = Number(values.companyId)
  const isCompanyMove = Number.isFinite(companyId) && companyId !== currentCompanyId

  return {
    leaving_date: toRequiredApiDate(values.leavingDate),
    leaving_reason: values.leavingReason.trim(),
    transfer_type: isCompanyMove ? 'company' : 'branch',
    ...(isCompanyMove ? { new_company_id: companyId } : {}),
    branch_id: idOrNull(values.branchId),
    department_id: idOrNull(values.departmentId),
    designation_id: Number(values.designationId),
    grade: values.grade,
    employment_type: values.employmentType,
    contract_period: isContractual ? idOrNull(values.contractPeriod) : null,
    ...(isContractual ? { contract_period_type: values.contractPeriodType } : {}),
    joining_date: toRequiredApiDate(values.joiningDate),
    confirmation_date: toRequiredApiDate(values.confirmationDate),
    renewal_date: isContractual ? toApiDate(values.renewalDate) : null,
  }
}

export function serviceEditToPayload(
  values: EmployeeServiceEditFormValues,
): EmployeeServiceEditPayload {
  const isContractual = values.employmentType !== PERMANENT_EMPLOYMENT_TYPE

  return {
    branch_id: idOrNull(values.branchId),
    department_id: idOrNull(values.departmentId),
    designation_id: Number(values.designationId),
    grade: values.grade,
    employment_type: values.employmentType,
    contract_period: isContractual ? idOrNull(values.contractPeriod) : null,
    ...(isContractual ? { contract_period_type: values.contractPeriodType } : {}),
    joining_date: toRequiredApiDate(values.joiningDate),
    confirmation_date: toRequiredApiDate(values.confirmationDate),
    renewal_date: isContractual ? toApiDate(values.renewalDate) : null,
  }
}

/** Seed the restricted edit form from the posting being corrected. */
export function serviceDetailToEditFormValues(
  detail: EmployeeTransferDetail,
  blank: EmployeeServiceEditFormValues,
): EmployeeServiceEditFormValues {
  const service = detail.serviceDetail
  return {
    branchId: service.branchId === null ? '' : String(service.branchId),
    departmentId: service.departmentId === null ? '' : String(service.departmentId),
    designationId: service.designationId === null ? '' : String(service.designationId),
    grade: service.grade,
    employmentType: service.employmentType || blank.employmentType,
    contractPeriod: service.contractPeriod === null ? '' : String(service.contractPeriod),
    contractPeriodType: service.contractPeriodType || blank.contractPeriodType,
    joiningDate: toFormDate(service.joiningDate),
    confirmationDate: toFormDate(service.confirmationDate),
    renewalDate: toFormDate(service.renewalDate),
  }
}

export function leaveServiceToPayload(
  values: LeaveServiceFormValues,
): LeaveServicePayload {
  return {
    leaving_date: toRequiredApiDate(values.leavingDate),
    leaving_reason: values.leavingReason.trim(),
  }
}
