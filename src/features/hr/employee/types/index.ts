import type { AuditFields } from '@/types/audit'
import type { Shift } from '@/features/master/shift'

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
  /**
   * The KYC identifiers carried on every employee read. Step 2 edits the full
   * `EmployeeKyc` through its own endpoint; this is what the list can show
   * without a request per row.
   */
  kyc: EmployeeKycSummary
  /**
   * Face images captured for attendance recognition — empty when the employee
   * has never enrolled, which is what the list's "View Faces" action keys off.
   */
  faces: EmployeeFace[]
}

/**
 * The statutory and bank identifiers that sit on the employee row itself — the
 * subset of step 2 that comes back with the list, and all the list column set
 * needs.
 */
export interface EmployeeKycSummary {
  pfNumber: string
  uanNumber: string
  esicNumber: string
  /** Resolve against the bank master for a name; the row carries only the id. */
  bankId: number | null
  bankAccountNumber: string
  bankBranchName: string
  ifscCode: string
  aadharNumber: string
}

/**
 * One enrolled face image. Captured in the mobile app, never from this portal —
 * the admin can look at them and clear them, nothing more.
 */
export interface EmployeeFace {
  id: number
  /** Storage key; `url` is the resolvable address to render. */
  key: string
  url: string
  /** `pose_vector` (primary enrolment) or `secondary_vector` (re-registration). */
  type: string
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

/* ── Step 9 — shift & roster ─────────────────────────────────────────────── */

/**
 * One entry of the assignment timeline.
 *
 * Both ids `null` is meaningful, not empty: it says "back to the department or
 * company default from this date", which is how an assignment is ENDED. The
 * timeline is append-only for that reason — deleting the old entry instead would
 * rewrite which shift the employee was judged against on days already closed.
 */
export interface EmployeeShiftAssignment extends AuditFields {
  id: number
  employeeId: number
  /** The posting the entry hangs off — the API resolves it from the date. */
  employeeServiceId: number
  shiftId: number | null
  shiftName: string
  rotationId: number | null
  rotationName: string
  /** `YYYY-MM-DD`. For a rotation this is also the cycle's anchor: week 1 starts here. */
  effectiveDate: string
}

/** Where a roster row came from — a manual override, or one the system laid down. */
export type RosterSourceType = 'MANUAL' | 'ROTATION' | 'POLICY'

/**
 * One per-date shift override. The highest-priority answer in the resolution
 * chain, and the only part of it that's safe to delete: a roster row says nothing
 * about history, it just outranks the rotation and the defaults for its one date.
 */
export interface EmployeeRosterEntry extends AuditFields {
  id: number
  employeeId: number
  employeeServiceId: number
  /** `YYYY-MM-DD`. */
  workDate: string
  shiftId: number
  shiftName: string
  sourceType: RosterSourceType
}

/**
 * Which link of the precedence chain answered for a date. Reading it is the only
 * way to tell "General, because it's the company default" (nothing to undo) from
 * "General, because somebody rostered it onto this date" (one row to remove).
 */
export type ShiftSource = 'roster' | 'rotation' | 'assignment' | 'department' | 'company'

/**
 * The shift an employee works on one date, and why.
 *
 * A `null` shift means the tenant has configured none at all — attendance then
 * falls back to its pre-shift behaviour, which is a different statement from "the
 * day is off".
 */
export interface EmployeeShiftOnDay {
  /** The date answered for, `YYYY-MM-DD`. */
  day: string
  shift: Shift | null
  source: ShiftSource | null
  isWeekOff: boolean
}
