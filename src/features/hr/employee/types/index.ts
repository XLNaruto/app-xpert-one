import type { AuditFields } from '@/types/audit'

/**
 * UI-facing records for the employee module.
 *
 * The API splits an employee across ten resources — the person, their KYC, the
 * wage structure they inherit, and one collection per later step — and this file
 * keeps that split: each step's tab reads and writes exactly one of these types.
 */

/* ── Step completion ─────────────────────────────────────────────────────── */

/**
 * Which steps of the wizard have been saved, as `completed_steps` on the
 * employee record. Only these seven count toward the progress ring — transfer
 * history and leave management are ongoing registers, not steps you finish.
 */
export interface EmployeeCompletedSteps {
  basicDetail: boolean
  kycDetail: boolean
  wageStructure: boolean
  familyDetail: boolean
  educationDetail: boolean
  documents: boolean
  assets: boolean
}

/* ── Step 1 — the person and their posting ───────────────────────────────── */

/**
 * One posting — where the employee sits in the hierarchy and on what terms.
 * The API keeps a row per posting and only ever appends, so this is the *current*
 * one on an employee record; the closed ones are step 8's history.
 */
export interface EmployeeService {
  id: number
  branchId: number | null
  departmentId: number | null
  designationId: number | null
  grade: string
  employmentType: string
  contractPeriod: number | null
  contractPeriodType: string
  joiningDate: string
  confirmationDate: string
  renewalDate: string
  leavingDate: string
  leavingReason: string
}

/**
 * An employee — the list row and the step 1 form, which are the same record.
 *
 * `code` is generated server-side, and `nationality` comes back on reads but
 * isn't writable through the create/edit body, so both are shown and never
 * edited.
 */
export interface Employee extends AuditFields {
  id: number
  companyId: number
  /** Server-generated employee code — read-only. */
  code: string
  /** Mr / Mrs / … — the salutation that fronts the name. */
  prefix: string
  name: string
  /** Object key of the profile photo, to be resolved with `mediaUrl()`. */
  photo: string
  gender: string
  birthDate: string
  maritalStatus: string
  relation: string
  relativeName: string

  currentAddress1: string
  currentAddress2: string
  currentAddress3: string
  currentCountry: string
  currentStateId: number | null
  currentDistrictId: number | null
  currentTaluka: string
  currentCity: string
  currentPinCode: string

  permanentAddress1: string
  permanentAddress2: string
  permanentAddress3: string
  permanentCountry: string
  permanentStateId: number | null
  permanentDistrictId: number | null
  permanentTaluka: string
  permanentCity: string
  permanentPinCode: string

  /** Read-only: the write body has no `nationality`. */
  nationality: string

  mobileNumber1: string
  mobileNumber2: string
  landlineNumber: string
  email: string

  bloodGroup: string
  height: string
  heightUnit: string
  weight: string
  weightUnit: string
  isDisability: boolean
  remarks: string

  isPoliceVerified: boolean
  isStampAgreement: boolean

  completedSteps: EmployeeCompletedSteps
  /** The current posting — `null` on a record whose postings are all closed. */
  service: EmployeeService | null
}

/* ── Step 2 — KYC ────────────────────────────────────────────────────────── */

/**
 * The employee's KYC columns. Every one is nullable: an untouched step comes
 * back as a record of blanks rather than a 404, which is why the screen decides
 * POST (first save, a full overwrite) vs PATCH from whether anything is filled.
 */
export interface EmployeeKyc {
  employeeId: number
  pfNumber: string
  uanNumber: string
  esicNumber: string
  bankId: number | null
  bankAccountNumber: string
  bankBranchName: string
  ifscCode: string
  aadharNumber: string
  nameAsPerAadhar: string
  panNumber: string
  epicNumber: string
  rationCardNumber: string
  drivingLicenceNumber: string
  drivingLicenceExpiryDate: string
  passportNumber: string
  passportValidFrom: string
  passportValidTo: string
}

/* ── Step 3 — the inherited wage structure ───────────────────────────────── */

/** One allowance or deduction head on the inherited wage structure. */
export interface EmployeeWageComponent {
  payComponentId: number
  componentType: string
  sortOrder: number
  amount: number
  amountType: string
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean
}

/**
 * The wage structure the employee inherits from the designation on their current
 * posting. Read-only by design — nothing is stored per employee, so pay changes
 * by editing the designation or by moving the employee through step 8.
 */
export interface EmployeeWageStructure {
  employeeId: number
  employeeServiceId: number
  designationId: number | null
  designationWageStructureId: number | null
  applicableDate: string
  salaryType: string
  wagesPerDay: number | null
  basicPay: number | null
  workingDayCalculationType: string
  workingDays: number | null
  extraDayAmountPerDay: number | null
  weeklyOff: string

  isPfActApplicable: boolean
  pfDeductionType: string
  pfDeductionAmount: number | null
  isEmployeePfContributionOnWageLimit: boolean
  isEmployerPfContributionOnWageLimit: boolean

  isEsicActApplicable: boolean
  esicDeductionBasis: string
  /** Always `''` — no per-employee column holds it (see the endpoint's note). */
  esicStartDate: string

  isPtActApplicable: boolean
  ptActType: string
  ptAmount: number | null

  isLwfActApplicable: boolean
  isLwfDeductFromWages: boolean
  lwfActType: string
  lwfAmount: number | null

  isOvertimeApplicable: boolean
  overtimeRatePerHour: number | null
  isPfApplicableOnOvertime: boolean
  isEsicApplicableOnOvertime: boolean
  isPtApplicableOnOvertime: boolean

  isTdsActApplicable: boolean
  isDisability: boolean

  salaryComponents: EmployeeWageComponent[]
}

/* ── Step 4 — family ─────────────────────────────────────────────────────── */

export interface EmployeeFamilyMember extends AuditFields {
  id: number
  employeeId: number
  fullName: string
  relation: string
  birthDate: string
  aadharNumber: string
  isNominee: boolean
}

/* ── Step 5 — education / experience ─────────────────────────────────────── */

export interface EmployeeEducation extends AuditFields {
  id: number
  employeeId: number | null
  educationName: string
  board: string
  passingYear: string
  percentage: string
}

/** Prior employment. Both dates are months (`YYYY-MM`), never full dates. */
export interface EmployeeExperience extends AuditFields {
  id: number
  employeeId: number | null
  companyName: string
  fromDate: string
  toDate: string
  designation: string
  salary: string
  leavingReason: string
  contactPersonName: string
  contactPersonNumber: string
}

/* ── Step 6 — documents ──────────────────────────────────────────────────── */

export interface EmployeeDocument extends AuditFields {
  id: number
  employeeId: number | null
  documentTypeId: number | null
  documentTypeName: string
  documentId: number | null
  documentName: string
  expiryDate: string
  /** Object key of the stored file, to be resolved with `mediaUrl()`. */
  document: string
}

/* ── Step 7 — assets ─────────────────────────────────────────────────────── */

/** Where an issued asset stands — the API's own three answers. */
export type EmployeeAssetStatus = 'ASSIGNED' | 'RETURNED' | 'LOST'

export interface EmployeeAsset extends AuditFields {
  id: number
  employeeId: number | null
  assetId: number | null
  assetName: string
  assignedDate: string
  validTill: string
  status: string
  remarks: string
}

/* ── Step 8 — transfer history ───────────────────────────────────────────── */

/**
 * One row of the posting history. `isCurrent` marks the open posting (no leaving
 * date); `isLatest` marks the newest row — only that one may be edited, since the
 * history is append-only.
 */
export interface EmployeeTransfer extends AuditFields {
  id: number
  companyId: number
  companyName: string
  branchId: number | null
  branchName: string
  departmentId: number | null
  departmentName: string
  designationId: number | null
  designationName: string
  joiningDate: string
  leavingDate: string
  isCurrent: boolean
  isLatest: boolean
}

/** The service detail behind one posting — what the row's Details dialog shows. */
export interface EmployeeServiceDetail {
  id: number
  companyId: number
  companyName: string
  branchId: number | null
  branchName: string
  departmentId: number | null
  departmentName: string
  designationId: number | null
  designationName: string
  grade: string
  employmentType: string
  contractPeriod: number | null
  contractPeriodType: string
  joiningDate: string
  confirmationDate: string
  renewalDate: string
  leavingDate: string
  leavingReason: string
  isCurrent: boolean
  isLatest: boolean
  isPoliceVerified: boolean
  isStampAgreement: boolean
}

/** The wage structure a posting was held under — a summary, not the full step 3. */
export interface EmployeeTransferWageStructure {
  designationWageStructureId: number | null
  salaryType: string
  basicPay: number | null
  wagesPerDay: number | null
  isPfActApplicable: boolean
  isEsicActApplicable: boolean
  isPtActApplicable: boolean
  isLwfActApplicable: boolean
  isOvertimeApplicable: boolean
  isTdsActApplicable: boolean
  weeklyOff: string
  isDisability: boolean
}

/** One posting expanded — what every step 8 write answers with. */
export interface EmployeeTransferDetail {
  wageStructure: EmployeeTransferWageStructure
  serviceDetail: EmployeeServiceDetail
}
