import type { ComboboxOption } from '@/components/ui/combobox'
import type { BranchFormValues } from './schemas'

/** What the ESIC contribution is calculated on. */
export const ESIC_DEDUCTS_ON_OPTIONS: ComboboxOption[] = [
  { label: 'Gross Salary', value: 'Gross Salary' },
  { label: 'Earned Salary', value: 'Earned Salary' },
  { label: 'Basic Salary', value: 'Basic Salary' },
]

/**
 * The `sort` values `/user/branches` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const BRANCH_SORT = {
  branchName: 'branch_name',
  city: 'city',
  createdAt: 'created_at',
} as const

/**
 * Newest branch first — the order the list opens in and reverts to. This is not
 * the endpoint's own default (branch name A→Z), so it's always sent.
 */
export const BRANCH_DEFAULT_SORT = { id: BRANCH_SORT.createdAt, desc: true }

/**
 * Blank "Applicable Acts" values — kept apart from the rest of the form because
 * they save to their own endpoint, and a branch with no acts row on file opens
 * the tab on exactly this.
 */
export const EMPTY_BRANCH_ACTS_FORM = {
  // PF act
  pfCode: '',
  epfActDate: '',
  fpfActDate: '',
  pfOfficeAddressId: '',
  pfUsername: '',
  pfPassword: '',

  // ESIC act
  esicCode: '',
  esicDeductsOn: '',
  esicRegistrationDate: '',
  esicOfficeAddressId: '',
  esicUsername: '',
  esicPassword: '',

  // Factory act
  factoryActDate: '',
  factoryLicenseNumber: '',
  factoryFinNumber: '',
  noOfEmployees: '',
  electricHorsePower: '',
  licenseExpiryDate: '',
  stabilityExpiryDate: '',
  factoryOfficeAddressId: '',

  // Professional tax act
  ptRegistrationDate: '',
  ptPecRegistrationNumber: '',
  ptPrcRegistrationNumber: '',
  ptCorporationName: '',
  ptStateId: '',
  ptDistrictId: '',

  // LWF act
  lwfRegistrationDate: '',
  lwfRegistrationNumber: '',
  lwfOfficeAddressId: '',
  lwfUsername: '',
  lwfPassword: '',

  // Employment exchange act
  exRegistrationDate: '',
  exRegistrationNumber: '',
  exOfficeAddressId: '',
} satisfies Partial<BranchFormValues>

/** Blank form values for a brand-new branch. */
export const EMPTY_BRANCH_FORM: BranchFormValues = {
  branchName: '',
  registrationNumber: '',
  panNumber: '',
  gstNumber: '',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  stateId: '',
  districtId: '',
  city: '',
  pinCode: '',
  phone: '',
  mobile1: '',
  mobile2: '',
  email: '',

  ...EMPTY_BRANCH_ACTS_FORM,
}
