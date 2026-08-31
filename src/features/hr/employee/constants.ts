import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  EmployeeAssetFormValues,
  EmployeeBasicFormValues,
  EmployeeDocumentFormValues,
  EmployeeEducationFormValues,
  EmployeeExperienceFormValues,
  EmployeeFamilyFormValues,
  EmployeeKycFormValues,
  EmployeeServiceEditFormValues,
  EmployeeTransferFormValues,
} from './schemas'

/* ── The wizard ──────────────────────────────────────────────────────────── */

/**
 * The nine steps, in order. The values double as the `tab` carried inside the
 * screen's encrypted `?data=` token, so a refresh comes back to the tab that was
 * open — and `nextTab()` walks this list after a save.
 */
export const EMPLOYEE_TABS = [
  'basic',
  'kyc',
  'wage',
  'family',
  'education',
  'documents',
  'assets',
  'transfers',
  'shifts',
  'leaveQuota',
] as const

export type EmployeeTab = (typeof EMPLOYEE_TABS)[number]

/** Tab labels, as the nav and the page headings show them. */
export const EMPLOYEE_TAB_LABELS: Record<EmployeeTab, string> = {
  basic: 'Basic Detail',
  kyc: 'KYC Detail',
  wage: 'Wage Structure',
  family: 'Family Detail',
  education: 'Education / Experience',
  documents: 'Documents',
  assets: 'Assets',
  transfers: 'Employee Service History',
  shifts: 'Shift & Roster',
  leaveQuota: 'Leave Allowance',
}

/**
 * What a timeline entry is being written for. The API tells the two apart by
 * whether the body carries a `shift_id` — and its absence is the meaningful way
 * to END an assignment, so it's an option here rather than a missing selection.
 */
export const ASSIGNMENT_MODE_OPTIONS: ComboboxOption[] = [
  { label: 'A single shift', value: 'shift' },
  { label: 'Back to the default (ends the assignment)', value: 'default' },
]

/**
 * The seven steps that count toward completion, paired with the flag on the
 * employee record's `completed_steps` that reports each one.
 *
 * Transfer history, Shift & Roster and Leave Allowance are deliberately absent:
 * all three are ongoing registers rather than steps you finish, and the API tracks
 * no flag for any of them — so the progress ring reads `n/7`, not `n/10`. An
 * employee on their department's default shift needs no shift row at all, and one
 * whose designation already carries the allowance needs no grant of their own, so
 * counting either would mark a complete record incomplete.
 */
export const EMPLOYEE_PROGRESS_STEPS = [
  { tab: 'basic', flag: 'basicDetail' },
  { tab: 'kyc', flag: 'kycDetail' },
  { tab: 'wage', flag: 'wageStructure' },
  { tab: 'family', flag: 'familyDetail' },
  { tab: 'education', flag: 'educationDetail' },
  { tab: 'documents', flag: 'documents' },
  { tab: 'assets', flag: 'assets' },
] as const

/**
 * The `sort` values `/user/employees` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here: the list gives each of these the
 * API's field name as its column id and marks every other column unsortable.
 */
export const EMPLOYEE_SORT = {
  name: 'name',
  code: 'code',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const

/** Newest employee first — the order the list opens in and reverts to. */
export const EMPLOYEE_DEFAULT_SORT = { id: EMPLOYEE_SORT.createdAt, desc: true }

/* ── Option sets ─────────────────────────────────────────────────────────── */

/** Salutation that fronts the name — stored as typed, no mapping table. */
export const PREFIX_OPTIONS: ComboboxOption[] = ['Mr', 'Mrs', 'Ms', 'Dr'].map(
  (value) => ({ label: value, value }),
)

export const GENDER_OPTIONS: ComboboxOption[] = [
  'Male',
  'Female',
  'Transgender',
  'Not Specified',
].map((value) => ({ label: value, value }))

/**
 * Marital status. The API stores lower-snake values (`un_married`), so the
 * option value is the wire value and the label is what a form shows — no mapping
 * table anywhere else.
 */
export const MARITAL_STATUS_OPTIONS: ComboboxOption[] = [
  { label: 'Married', value: 'married' },
  { label: 'Unmarried', value: 'un_married' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widow', value: 'widow' },
  { label: 'Widower', value: 'widower' },
  { label: 'Not Specified', value: 'not_specified' },
]

/** Relation to the employee — shared by step 1's relative and step 4's family. */
export const RELATION_OPTIONS: ComboboxOption[] = [
  'Father',
  'Mother',
  'Husband',
  'Wife',
  'Spouse',
  'Brother',
  'Sister',
  'Son',
  'Daughter',
  'Guardian',
].map((value) => ({ label: value, value }))

export const BLOOD_GROUP_OPTIONS: ComboboxOption[] = [
  'A+',
  'B+',
  'AB+',
  'O+',
  'A-',
  'B-',
  'AB-',
  'O-',
].map((value) => ({ label: value, value }))

/** Height units, spelled the way the API's enum does. */
export const HEIGHT_UNIT_OPTIONS: ComboboxOption[] = [
  { label: 'CM', value: 'CM' },
  { label: 'Inch', value: 'Inch' },
  { label: 'Feet', value: 'Feet' },
]

export const WEIGHT_UNIT_OPTIONS: ComboboxOption[] = [
  { label: 'Kg', value: 'Kg' },
  { label: 'Pound', value: 'Pound' },
]

export const GRADE_OPTIONS: ComboboxOption[] = [
  'SKILLED',
  'HIGH-SKILLED',
  'SEMI-SKILLED',
  'UN-SKILLED',
].map((value) => ({ label: value, value }))

export const EMPLOYMENT_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Permanent', value: 'PERMANENT' },
  { label: 'Contractual', value: 'CONTRACTUAL' },
]

export const CONTRACT_PERIOD_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Year', value: 'YEAR' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Day', value: 'DAY' },
]

/** Employment type that carries no contract period, renewal or expiry. */
export const PERMANENT_EMPLOYMENT_TYPE = 'PERMANENT'

export const ASSET_STATUS_OPTIONS: ComboboxOption[] = [
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'Returned', value: 'RETURNED' },
  { label: 'Lost', value: 'LOST' },
]

/** Earliest passing year the education dropdown reaches back to. */
/**
 * The floor of the passing-year picker. A qualification older than this belongs to
 * someone past retirement, so the decade view starts here rather than scrolling
 * back through empty centuries.
 */
export const EARLIEST_PASSING_DATE = new Date(1970, 0, 1)

/** Youngest an employee may be, in years. */
export const MINIMUM_EMPLOYEE_AGE = 18

/** Content types the employee-document presign will sign for. */
export const DOCUMENT_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** What the document picker advertises, matching the types above. */
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'

/** What the photo picker advertises — the three types the presign signs for. */
export const PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp'

/* ── Blank forms ─────────────────────────────────────────────────────────── */

/**
 * Step 1, blank. `heightUnit` / `weightUnit` open on a unit rather than empty
 * because the API's enums have no "unset" member — an unfilled height simply
 * sends no value at all.
 */
export const EMPTY_EMPLOYEE_BASIC_FORM: EmployeeBasicFormValues = {
  photo: '',
  prefix: '',
  name: '',
  gender: '',
  birthDate: '',
  maritalStatus: '',
  relation: '',
  relativeName: '',

  currentAddress1: '',
  currentAddress2: '',
  currentAddress3: '',
  currentCountry: 'India',
  currentStateId: '',
  currentDistrictId: '',
  currentTaluka: '',
  currentCity: '',
  currentPinCode: '',

  sameAsCurrent: false,
  permanentAddress1: '',
  permanentAddress2: '',
  permanentAddress3: '',
  permanentCountry: 'India',
  permanentStateId: '',
  permanentDistrictId: '',
  permanentTaluka: '',
  permanentCity: '',
  permanentPinCode: '',

  mobileNumber1: '',
  mobileNumber2: '',
  landlineNumber: '',
  email: '',

  bloodGroup: '',
  height: '',
  heightUnit: 'CM',
  weight: '',
  weightUnit: 'Kg',
  isDisability: false,
  remarks: '',

  branchId: '',
  departmentId: '',
  designationId: '',
  grade: '',
  employmentType: PERMANENT_EMPLOYMENT_TYPE,
  contractPeriod: '',
  contractPeriodType: 'YEAR',
  joiningDate: '',
  confirmationDate: '',
  renewalDate: '',
  isPoliceVerified: false,
  isStampAgreement: false,
  leavingDate: '',
  leavingReason: '',
}

export const EMPTY_EMPLOYEE_KYC_FORM: EmployeeKycFormValues = {
  pfNumber: '',
  uanNumber: '',
  esicNumber: '',
  bankId: '',
  bankAccountNumber: '',
  bankBranchName: '',
  ifscCode: '',
  aadharNumber: '',
  nameAsPerAadhar: '',
  panNumber: '',
  epicNumber: '',
  rationCardNumber: '',
  drivingLicenceNumber: '',
  drivingLicenceExpiryDate: '',
  passportNumber: '',
  passportValidFrom: '',
  passportValidTo: '',
}

export const EMPTY_EMPLOYEE_FAMILY_FORM: EmployeeFamilyFormValues = {
  fullName: '',
  relation: '',
  birthDate: '',
  aadharNumber: '',
  isNominee: false,
}

/**
 * What a prior employer's salary was quoted for. Nullable on the record — rows
 * entered before the column existed don't say, and a guess would be a claim.
 */
export const EXPERIENCE_CTC_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Per month', value: 'MONTHLY' },
  { label: 'Per year', value: 'YEARLY' },
]

export const EMPTY_EMPLOYEE_EDUCATION_FORM: EmployeeEducationFormValues = {
  educationName: '',
  board: '',
  passingYear: '',
  percentage: '',
}

export const EMPTY_EMPLOYEE_EXPERIENCE_FORM: EmployeeExperienceFormValues = {
  companyName: '',
  fromDate: '',
  toDate: '',
  designation: '',
  salary: '',
  ctcType: '',
  leavingReason: '',
  contactPersonName: '',
  contactPersonNumber: '',
  contactPersonEmail: '',
  isVerified: false,
  verificationReview: '',
  verifiedByName: '',
}

export const EMPTY_EMPLOYEE_DOCUMENT_FORM: EmployeeDocumentFormValues = {
  documentTypeId: '',
  documentId: '',
  expiryDate: '',
  document: '',
}

export const EMPTY_EMPLOYEE_ASSET_FORM: EmployeeAssetFormValues = {
  assetId: '',
  variantId: '',
  hasVariants: false,
  status: 'ASSIGNED',
  assignedDate: '',
  validTill: '',
  remarks: '',
}

export const EMPTY_EMPLOYEE_TRANSFER_FORM: EmployeeTransferFormValues = {
  leavingDate: '',
  leavingReason: '',
  companyId: '',
  branchId: '',
  departmentId: '',
  designationId: '',
  grade: '',
  employmentType: PERMANENT_EMPLOYMENT_TYPE,
  contractPeriod: '',
  contractPeriodType: 'YEAR',
  joiningDate: '',
  confirmationDate: '',
  renewalDate: '',
}

export const EMPTY_EMPLOYEE_SERVICE_EDIT_FORM: EmployeeServiceEditFormValues = {
  branchId: '',
  departmentId: '',
  designationId: '',
  grade: '',
  employmentType: PERMANENT_EMPLOYMENT_TYPE,
  contractPeriod: '',
  contractPeriodType: 'YEAR',
  joiningDate: '',
  confirmationDate: '',
  renewalDate: '',
}

