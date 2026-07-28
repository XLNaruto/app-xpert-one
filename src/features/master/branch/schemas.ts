import { z } from 'zod'

const PIN_RE = /^\d{6}$/
const DIGITS_RE = /^\d+$/

/** Passes when the value is blank (optional field) or matches `re`. */
const optionalMatch = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || re.test(v), message)

/** Every optional free-text field on the branch form. */
const text = z.string().trim()

/**
 * Create/edit form for a branch master record. Covers both tabs of the screen:
 * the branch/address details and every applicable act.
 */
export const branchSchema = z.object({
  // Branch information
  branchName: z.string().trim().min(1, 'Branch name is required'),

  // Address details
  addressLine1: z.string().trim().min(1, 'Address line 1 is required'),
  addressLine2: text,
  addressLine3: text,
  state: text,
  district: text,
  city: text,
  pinCode: optionalMatch(PIN_RE, 'Pin code must be 6 digits'),

  // PF act
  pfCode: text,
  epfActDate: text,
  fpfActDate: text,
  pfState: text,
  pfDistrict: text,
  pfOfficeAddress: text,
  pfUsername: text,
  pfPassword: text,

  // ESIC act
  esicCode: text,
  esicDeductsOn: text,
  esicRegistrationDate: text,
  esicState: text,
  esicDistrict: text,
  esicOfficeAddress: text,
  esicUsername: text,
  esicPassword: text,

  // Factory act
  factoryActDate: text,
  factoryLicenseNumber: text,
  factoryFinNumber: text,
  employeeCount: optionalMatch(DIGITS_RE, 'Enter a whole number'),
  electricHorsePower: text,
  licenseExpiryDate: text,
  stabilityExpiryDate: text,

  // Professional tax act
  ptRegistrationDate: text,
  pecRegistrationNumber: text,
  prcRegistrationNumber: text,
  corporationName: text,

  // LWF act
  lwfRegistrationDate: text,
  lwfRegistrationNumber: text,
  lwfOfficeAddressId: text,
  lwfUsername: text,
  lwfPassword: text,

  // Employment exchange act
  eeRegistrationDate: text,
  eeRegistrationNumber: text,
})

export type BranchFormValues = z.infer<typeof branchSchema>

/** Field names that live on the "Branch Detail" tab — used to route validation errors to the right tab. */
export const BRANCH_DETAIL_FIELDS = [
  'branchName',
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'state',
  'district',
  'city',
  'pinCode',
] as const satisfies readonly (keyof BranchFormValues)[]
