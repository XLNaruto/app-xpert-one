import { z } from 'zod'

/** PAN — five letters, four digits, one letter (e.g. ABCDE1234F). */
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
/** GSTIN — 15-char state-code + PAN + entity + Z + checksum. */
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/
const MOBILE_RE = /^\d{10}$/
const PIN_RE = /^\d{6}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Passes when the value is blank (optional field) or matches `re`. */
const optionalMatch = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || re.test(v), message)

const DIGITS_RE = /^\d+$/

/** An optional free-text field, capped at the API's column length. */
const text = (max: number) =>
  z.string().trim().max(max, `Cannot exceed ${max} characters`)

/**
 * An optional act field. Dates come from `<DateField>` already shaped
 * `yyyy-MM-dd`, so they take no `max`.
 */
const actText = (max?: number) =>
  max === undefined
    ? z.string().trim()
    : z.string().trim().max(max, `Cannot exceed ${max} characters`)

/** A reference into another master, held as the id string a combobox returns. */
const id = z.string().trim()

/**
 * Create/edit form for a branch master record. Covers both tabs of the screen:
 * the branch/address/contact details and every applicable act.
 *
 * The branch name is the only field `/user/branches` insists on — everything
 * else is optional and stored as `null` when left blank. State and district are
 * held as id strings (that's what the combobox gives us) and parsed to numbers
 * by the mappers.
 */
export const branchSchema = z.object({
  // Branch information
  branchName: z
    .string()
    .trim()
    .min(1, 'Branch name is required')
    .max(200, 'Cannot exceed 200 characters'),
  registrationNumber: text(100),
  panNumber: optionalMatch(PAN_RE, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  gstNumber: optionalMatch(GST_RE, 'Enter a valid 15-character GST number'),

  // Address details
  addressLine1: text(500),
  addressLine2: text(500),
  addressLine3: text(500),
  stateId: z.string().trim(),
  districtId: z.string().trim(),
  city: text(200),
  pinCode: optionalMatch(PIN_RE, 'Pin code must be 6 digits'),

  // Contact details
  phone: text(20),
  mobile1: optionalMatch(MOBILE_RE, 'Enter a valid 10-digit mobile number'),
  mobile2: optionalMatch(MOBILE_RE, 'Enter a valid 10-digit mobile number'),
  email: optionalMatch(EMAIL_RE, 'Enter a valid email address'),

  // ---------------------------------------------------------------------
  // Applicable acts — saved to `/user/act-registrations`, one row per branch,
  // alongside the branch itself. States, districts and offices are held as id
  // strings (that's what the combobox gives us) and parsed to numbers by
  // `actsToPayload()`.
  // ---------------------------------------------------------------------

  // PF act
  pfCode: actText(100),
  epfActDate: actText(),
  fpfActDate: actText(),
  pfOfficeAddressId: id,
  pfUsername: actText(100),
  pfPassword: actText(200),

  // ESIC act
  esicCode: actText(100),
  esicDeductsOn: actText(100),
  esicRegistrationDate: actText(),
  esicOfficeAddressId: id,
  esicUsername: actText(100),
  esicPassword: actText(200),

  // Factory act
  factoryActDate: actText(),
  factoryLicenseNumber: actText(100),
  factoryFinNumber: actText(100),
  noOfEmployees: optionalMatch(DIGITS_RE, 'Enter a whole number'),
  electricHorsePower: optionalMatch(DIGITS_RE, 'Enter a whole number'),
  licenseExpiryDate: actText(),
  stabilityExpiryDate: actText(),
  factoryOfficeAddressId: id,

  // Professional tax act
  ptRegistrationDate: actText(),
  ptPecRegistrationNumber: actText(100),
  ptPrcRegistrationNumber: actText(100),
  ptCorporationName: actText(200),
  ptStateId: id,
  ptDistrictId: id,

  // LWF act
  lwfRegistrationDate: actText(),
  lwfRegistrationNumber: actText(100),
  lwfOfficeAddressId: id,
  lwfUsername: actText(100),
  lwfPassword: actText(200),

  // Employment exchange act
  exRegistrationDate: actText(),
  exRegistrationNumber: actText(100),
  exOfficeAddressId: id,
})

export type BranchFormValues = z.infer<typeof branchSchema>

/**
 * Field names that live on the "Branch Detail" tab — used to route validation
 * errors to the tab holding them, since a hidden tab's errors are invisible.
 */
export const BRANCH_DETAIL_FIELDS = [
  'branchName',
  'registrationNumber',
  'panNumber',
  'gstNumber',
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'stateId',
  'districtId',
  'city',
  'pinCode',
  'phone',
  'mobile1',
  'mobile2',
  'email',
] as const satisfies readonly (keyof BranchFormValues)[]

/**
 * One branch as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/branches` and
 * `GET/PATCH /user/branches/:id` answer with the record's own columns only —
 * hence the optional audit fields, which the mapper reads as an empty trail.
 */
export const branchResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  branch_name: z.string(),
  city: z.string().nullable(),
  phone: z.string().nullable(),
  mobile_number1: z.string().nullable(),
  mobile_number2: z.string().nullable(),
  email: z.string().nullable(),
  registration_number: z.string().nullable(),
  pan_number: z.string().nullable(),
  gst_number: z.string().nullable(),
  address1: z.string().nullable(),
  address2: z.string().nullable(),
  address3: z.string().nullable(),
  state_id: z.number().nullable(),
  district_id: z.number().nullable(),
  /**
   * Resolved names, when the API sends them. Not in the spec today — the list
   * and detail screens want them, and joining the geography masters client-side
   * would cost an extra request per page, so they're read straight off the
   * record and fill in as soon as the endpoint returns them.
   */
  state_name: z.string().nullish(),
  district_name: z.string().nullish(),
  pin_code: z.string().nullable(),
  created_at: z.string(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type BranchResponse = z.infer<typeof branchResponseSchema>

/** `GET /user/branches` — an offset-paginated page of branches. */
export const branchesResponseSchema = z.object({
  items: z.array(branchResponseSchema),
  total: z.number(),
})

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent.
 *
 * Optional fields go as `null`, never `''` — `email` carries a format check and
 * `pin_code` a length, so an empty string is a validation error where a null is
 * simply "not recorded".
 */
export interface BranchPayload {
  company_id: number
  branch_name: string
  registration_number: string | null
  pan_number: string | null
  gst_number: string | null
  address1: string | null
  address2: string | null
  address3: string | null
  state_id: number | null
  district_id: number | null
  city: string | null
  pin_code: string | null
  phone: string | null
  mobile_number1: string | null
  mobile_number2: string | null
  email: string | null
}

/** The update body — an edit can't move a branch between companies. */
export type BranchUpdatePayload = Omit<BranchPayload, 'company_id'>

/** One act-registration row as the API returns it — every act column nullable. */
export const actRegistrationResponseSchema = z.object({
  id: z.number(),
  branch_id: z.number(),

  pf_code: z.string().nullable(),
  epf_act_date: z.string().nullable(),
  fpf_act_date: z.string().nullable(),
  pf_state_id: z.number().nullable(),
  pf_district_id: z.number().nullable(),
  pf_office_address_id: z.number().nullable(),
  pf_username: z.string().nullable(),
  pf_password: z.string().nullable(),

  esic_code: z.string().nullable(),
  esic_deducts_on: z.string().nullable(),
  esic_registration_date: z.string().nullable(),
  esic_state_id: z.number().nullable(),
  esic_district_id: z.number().nullable(),
  esic_office_address_id: z.number().nullable(),
  esic_username: z.string().nullable(),
  esic_password: z.string().nullable(),

  factory_act_date: z.string().nullable(),
  factory_license_number: z.string().nullable(),
  factory_fin_number: z.string().nullable(),
  no_of_employees: z.number().nullable(),
  electric_horse_power: z.number().nullable(),
  license_expiry_date: z.string().nullable(),
  stability_expiry_date: z.string().nullable(),
  factory_office_address_id: z.number().nullable(),

  pt_registration_date: z.string().nullable(),
  pt_pec_registration_number: z.string().nullable(),
  pt_prc_registration_number: z.string().nullable(),
  pt_corporation_name: z.string().nullable(),
  pt_state_id: z.number().nullable(),
  pt_district_id: z.number().nullable(),

  lwf_registration_date: z.string().nullable(),
  lwf_registration_number: z.string().nullable(),
  lwf_office_address_id: z.number().nullable(),
  lwf_username: z.string().nullable(),
  lwf_password: z.string().nullable(),

  ex_registration_date: z.string().nullable(),
  ex_registration_number: z.string().nullable(),
  ex_office_address_id: z.number().nullable(),

  created_at: z.string(),
})

export type ActRegistrationResponse = z.infer<typeof actRegistrationResponseSchema>

/**
 * `GET /user/act-registrations?branch_id=` — the branch's acts, or `null` when
 * the tab has never been saved. That null is what makes a save a POST.
 */
export const branchActRegistrationSchema = z.object({
  act_registration: actRegistrationResponseSchema.nullable(),
})

/**
 * The four columns the acts tab doesn't collect. PF and ESIC record the office
 * they're registered with and nothing more; only Professional Tax keeps a state
 * and district. They're never sent, so a PATCH leaves whatever the server holds
 * for them untouched rather than nulling it out from a screen that can't show
 * it.
 */
type UnmanagedActColumns =
  | 'pf_state_id'
  | 'pf_district_id'
  | 'esic_state_id'
  | 'esic_district_id'

/**
 * The act-registration body. The endpoint rejects unknown keys, so this is
 * exactly what may be sent; `branch_id` rides along on create only, since the
 * owning branch is fixed.
 *
 * Every value the tab does collect is sent, `null` where the field is blank — a
 * PATCH treats an omitted key as "leave alone" and an explicit `null` as
 * "clear", and the form always submits the whole tab, so clearing a field has to
 * reach the server.
 */
export type ActRegistrationUpdatePayload = {
  [K in Exclude<
    keyof ActRegistrationResponse,
    'id' | 'branch_id' | 'created_at' | UnmanagedActColumns
  >]: ActRegistrationResponse[K]
}

export interface ActRegistrationPayload extends ActRegistrationUpdatePayload {
  branch_id: number
}
