import type { ComboboxOption } from '@/components/ui/combobox'
import type { BranchFormValues } from './schemas'

/** What the ESIC contribution is calculated on. */
export const ESIC_DEDUCTS_ON_OPTIONS: ComboboxOption[] = [
  { label: 'Gross Salary', value: 'Gross Salary' },
  { label: 'Earned Salary', value: 'Earned Salary' },
  { label: 'Basic Salary', value: 'Basic Salary' },
]

/** Blank form values for a brand-new branch. */
export const EMPTY_BRANCH_FORM: BranchFormValues = {
  branchName: '',

  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  state: '',
  district: '',
  city: '',
  pinCode: '',

  pfCode: '',
  epfActDate: '',
  fpfActDate: '',
  pfState: '',
  pfDistrict: '',
  pfOfficeAddress: '',
  pfUsername: '',
  pfPassword: '',

  esicCode: '',
  esicDeductsOn: '',
  esicRegistrationDate: '',
  esicState: '',
  esicDistrict: '',
  esicOfficeAddress: '',
  esicUsername: '',
  esicPassword: '',

  factoryActDate: '',
  factoryLicenseNumber: '',
  factoryFinNumber: '',
  employeeCount: '',
  electricHorsePower: '',
  licenseExpiryDate: '',
  stabilityExpiryDate: '',

  ptRegistrationDate: '',
  pecRegistrationNumber: '',
  prcRegistrationNumber: '',
  corporationName: '',

  lwfRegistrationDate: '',
  lwfRegistrationNumber: '',
  lwfOfficeAddressId: '',
  lwfUsername: '',
  lwfPassword: '',

  eeRegistrationDate: '',
  eeRegistrationNumber: '',
}
