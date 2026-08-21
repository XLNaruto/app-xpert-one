import { z } from 'zod'
import { shiftResponseSchema } from '@/features/master/shift'
import {
  AADHAAR_RE,
  AMOUNT_RE,
  EMAIL_RE,
  MOBILE_RE,
  PERSON_NAME_RE,
  PIN_CODE_RE,
  RECORD_NAME_RE,
  aadhaarField,
  accountNumberField,
  emailField,
  esicNumberField,
  ifscField,
  mobileField,
  optionalMatch,
  panField,
  personNameField,
  recordNameField,
  uanField,
} from '@/lib/validation'
import { MINIMUM_EMPLOYEE_AGE, PERMANENT_EMPLOYMENT_TYPE } from './constants'

/**
 * Zod for the employee module: one form schema per step, plus the response shape
 * of every endpoint behind them.
 *
 * Two conventions run through the whole file:
 *
 * - **Forms hold strings.** Ids come out of a `<Combobox>` as strings and dates
 *   out of a `<DatePicker>` as `yyyy-MM-dd`; the mappers convert on the way to
 *   the API and back. So a blank field is `''`, never `null` or `undefined`.
 * - **The API's write bodies reject unknown keys** (`additionalProperties:
 *   false`), so each `*Payload` type here is exactly what may be sent — nothing
 *   is spread into a request wholesale.
 */

/* ── Shared field pieces ─────────────────────────────────────────────────── */

/** `yyyy-MM` — the month format an experience row's dates travel in. */
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/**
 * The shared patterns and field builders — a PAN, an IFSC or a person's name
 * means the same thing here as it does on every other screen. `optionalPattern`
 * is the local alias for the shared `optionalMatch`, kept because the row-level
 * `superRefine`s below read against it.
 */
const optionalPattern = optionalMatch

/** A person's name — letters and name punctuation only, never digits. */
const nameField = (label: string) => personNameField(label)

/** Whole years between a `yyyy-MM-dd` date and today. */
function yearsSince(date: string): number {
  const then = new Date(date)
  const now = new Date()
  let years = now.getFullYear() - then.getFullYear()
  const monthDelta = now.getMonth() - then.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < then.getDate())) years -= 1
  return years
}

/* ── Step 1 — basic detail + posting ─────────────────────────────────────── */

/**
 * Step 1's form: the person, their address, contact, health, and the FIRST
 * posting — which the API creates in the same call, hence the service fields
 * sitting on the same schema.
 *
 * The API itself requires only `company_id`, so everything marked required here
 * is a house rule: an employee record with no name, no joining date or no
 * designation is of no use to payroll, and catching that in the form beats
 * discovering it later.
 */
export const employeeBasicSchema = z
  .object({
    /** Object key from the photo presign — never the file. */
    photo: z.string(),

    /** Salutation in front of the name — optional, stored as chosen. */
    prefix: z.string().trim(),
    name: nameField('employee name'),
    gender: z.string().trim().min(1, 'Please select a gender'),
    birthDate: z
      .string()
      .trim()
      .min(1, 'Please select a date of birth')
      .refine(
        (value) => yearsSince(value) >= MINIMUM_EMPLOYEE_AGE,
        `Employee must be at least ${MINIMUM_EMPLOYEE_AGE} years old`,
      ),
    maritalStatus: z.string().trim().min(1, 'Please select a marital status'),
    relation: z.string().trim().min(1, 'Please select a relation'),
    relativeName: nameField('relative name'),

    currentAddress1: z
      .string()
      .trim()
      .min(1, 'Please enter the current address')
      .max(255, 'Cannot exceed 255 characters'),
    currentAddress2: z.string().trim().max(255, 'Cannot exceed 255 characters'),
    currentAddress3: z.string().trim().max(255, 'Cannot exceed 255 characters'),
    currentCountry: z.string().trim().max(60, 'Cannot exceed 60 characters'),
    currentStateId: z.string(),
    currentDistrictId: z.string(),
    currentTaluka: recordNameField('the taluka', { required: false, max: 255 }),
    currentCity: recordNameField('the city', { required: false, max: 255 }),
    currentPinCode: optionalPattern(PIN_CODE_RE, 'PIN code must be 6 digits'),

    /**
     * UI-only: while on, the permanent block is hidden and kept in step with the
     * current one. It never reaches the API — both address sets are stored.
     */
    sameAsCurrent: z.boolean(),
    permanentAddress1: z.string().trim().max(255, 'Cannot exceed 255 characters'),
    permanentAddress2: z.string().trim().max(255, 'Cannot exceed 255 characters'),
    permanentAddress3: z.string().trim().max(255, 'Cannot exceed 255 characters'),
    permanentCountry: z.string().trim().max(60, 'Cannot exceed 60 characters'),
    permanentStateId: z.string(),
    permanentDistrictId: z.string(),
    permanentTaluka: recordNameField('the taluka', { required: false, max: 255 }),
    permanentCity: recordNameField('the city', { required: false, max: 255 }),
    permanentPinCode: optionalPattern(PIN_CODE_RE, 'PIN code must be 6 digits'),

    mobileNumber1: mobileField({ required: true, label: 'a mobile number' }),
    mobileNumber2: mobileField(),
    landlineNumber: optionalPattern(/^\d{6,12}$/, 'Enter 6 to 12 digits'),
    email: emailField(),

    bloodGroup: z.string(),
    height: optionalPattern(AMOUNT_RE, 'Enter a number, e.g. 170 or 5.8'),
    heightUnit: z.string(),
    weight: optionalPattern(AMOUNT_RE, 'Enter a number, e.g. 68 or 68.5'),
    weightUnit: z.string(),
    isDisability: z.boolean(),
    remarks: z.string().trim().max(1000, 'Cannot exceed 1000 characters'),

    /**
     * The posting. Branch and department are optional because the API supports a
     * bypass hierarchy — a designation alone is a valid posting — but the
     * designation itself is what the wage structure hangs off, so it's required.
     */
    branchId: z.string(),
    departmentId: z.string(),
    designationId: z.string().trim().min(1, 'Please select a designation'),
    grade: z.string().trim().min(1, 'Please select a grade'),
    employmentType: z.string().trim().min(1, 'Please select an employment type'),
    contractPeriod: z.string(),
    contractPeriodType: z.string(),
    joiningDate: z.string().trim().min(1, 'Please select a joining date'),
    confirmationDate: z.string().trim().min(1, 'Please select a confirmation date'),
    renewalDate: z.string(),
    isPoliceVerified: z.boolean(),
    isStampAgreement: z.boolean(),

    /** Leaving is recorded here for a correction; a real exit goes through step 8. */
    leavingDate: z.string(),
    leavingReason: z.string().trim().max(500, 'Cannot exceed 500 characters'),
  })
  // A contract only means something with a period behind it.
  .refine(
    (v) => v.employmentType === PERMANENT_EMPLOYMENT_TYPE || v.contractPeriod.trim() !== '',
    { path: ['contractPeriod'], message: 'Please enter the contract period' },
  )
  .refine(
    (v) => v.employmentType === PERMANENT_EMPLOYMENT_TYPE || v.renewalDate.trim() !== '',
    { path: ['renewalDate'], message: 'Please select a renewal date' },
  )
  // Confirmation can't precede the day the employee started.
  .refine((v) => !v.joiningDate || !v.confirmationDate || v.confirmationDate >= v.joiningDate, {
    path: ['confirmationDate'],
    message: 'Confirmation date cannot be before the joining date',
  })
  .refine((v) => !v.joiningDate || !v.leavingDate || v.leavingDate >= v.joiningDate, {
    path: ['leavingDate'],
    message: 'Leaving date cannot be before the joining date',
  })
  // A leaving date without a reason leaves the record unexplained, and vice versa.
  .refine((v) => !v.leavingDate || v.leavingReason.trim() !== '', {
    path: ['leavingReason'],
    message: 'Please enter the leaving reason',
  })

export type EmployeeBasicFormValues = z.infer<typeof employeeBasicSchema>

/** `completed_steps` on the employee record. */
export const completedStepsResponseSchema = z.object({
  basic_detail: z.boolean(),
  kyc_detail: z.boolean(),
  wage_structure: z.boolean(),
  family_detail: z.boolean(),
  education_detail: z.boolean(),
  documents: z.boolean(),
  assets: z.boolean(),
})

/**
 * One captured face image on an employee row. `type` says which vector the shot
 * was captured for — `pose_vector` is the primary enrolment set, and
 * `secondary_vector` the re-registration set.
 */
export const employeeFaceResponseSchema = z.object({
  id: z.number(),
  key: z.string().nullish(),
  url: z.string().nullish(),
  type: z.string().nullish(),
})

/** The current posting, as it rides on an employee response. */
export const employeeServiceResponseSchema = z.object({
  id: z.number(),
  branch_id: z.number().nullish(),
  department_id: z.number().nullish(),
  designation_id: z.number().nullish(),
  grade: z.string().nullish(),
  employment_type: z.string().nullish(),
  contract_period: z.number().nullish(),
  contract_period_type: z.string().nullish(),
  joining_date: z.string().nullish(),
  confirmation_date: z.string().nullish(),
  renewal_date: z.string().nullish(),
  leaving_date: z.string().nullish(),
  leaving_reason: z.string().nullish(),
})

/**
 * One employee. The KYC columns come back here too (they live on the same table);
 * the KYC screen still reads its own endpoint, but the list renders them from
 * here rather than asking per row.
 *
 * `service` is absent on a list row and present on the detail read — which is
 * why every field below the person is `nullish`: the two responses share this
 * schema, and a list row simply carries less.
 */
export const employeeResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  code: z.string().nullish(),
  prefix: z.string().nullish(),
  name: z.string().nullish(),
  photo: z.string().nullish(),
  gender: z.string().nullish(),
  birth_date: z.string().nullish(),
  marital_status: z.string().nullish(),
  relation: z.string().nullish(),
  relative_name: z.string().nullish(),

  current_address1: z.string().nullish(),
  current_address2: z.string().nullish(),
  current_address3: z.string().nullish(),
  current_country: z.string().nullish(),
  current_state_id: z.number().nullish(),
  current_district_id: z.number().nullish(),
  current_taluka: z.string().nullish(),
  current_city: z.string().nullish(),
  current_pin_code: z.string().nullish(),

  permanent_address1: z.string().nullish(),
  permanent_address2: z.string().nullish(),
  permanent_address3: z.string().nullish(),
  permanent_country: z.string().nullish(),
  permanent_state_id: z.number().nullish(),
  permanent_district_id: z.number().nullish(),
  permanent_taluka: z.string().nullish(),
  permanent_city: z.string().nullish(),
  permanent_pin_code: z.string().nullish(),

  nationality: z.string().nullish(),
  mobile_number1: z.string().nullish(),
  mobile_number2: z.string().nullish(),
  landline_number: z.string().nullish(),
  email: z.string().nullish(),

  blood_group: z.string().nullish(),
  height: z.string().nullish(),
  height_unit: z.string().nullish(),
  weight: z.string().nullish(),
  weight_unit: z.string().nullish(),
  is_disability: z.boolean().nullish(),
  remarks: z.string().nullish(),
  is_police_verified: z.boolean().nullish(),
  is_stamp_agreement: z.boolean().nullish(),

  /**
   * KYC columns. They live on the employee table, so they ride on every read —
   * the KYC *screen* still uses its own endpoint, but the list shows these.
   */
  pf_number: z.string().nullish(),
  uan_number: z.string().nullish(),
  esic_number: z.string().nullish(),
  bank_id: z.number().nullish(),
  bank_account_number: z.string().nullish(),
  bank_branch_name: z.string().nullish(),
  ifsc_code: z.string().nullish(),
  aadhar_number: z.string().nullish(),

  completed_steps: completedStepsResponseSchema.nullish(),
  service: employeeServiceResponseSchema.nullish(),
  /** Every face image captured for this employee — empty when none is enrolled. */
  employee_faces: z.array(employeeFaceResponseSchema).nullish(),

  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeResponse = z.infer<typeof employeeResponseSchema>

export const employeesResponseSchema = z.object({
  items: z.array(employeeResponseSchema),
  total: z.number(),
})

/**
 * `GET /user/employees/list` — the PICKER row, four columns and nothing else.
 *
 * A different read from the register above: it spans every non-deleted company
 * of the account (so it takes no `company_id`), carries no posting, no wage and
 * no face, and its `search` matches the NAME alone. Use it wherever a screen
 * points AT an employee rather than showing them.
 */
export const employeePickerResponseSchema = z.object({
  id: z.number(),
  name: z.string().nullish(),
  primary_mobile_number: z.string().nullish(),
  email: z.string().nullish(),
})
export type EmployeePickerResponse = z.infer<typeof employeePickerResponseSchema>

export const employeePickerListResponseSchema = z.object({
  items: z.array(employeePickerResponseSchema),
  total: z.number(),
})

/** What `DELETE /user/employees/:id/face` answers. */
export const deleteFaceResponseSchema = z.object({
  employee_id: z.number(),
  face_id: z.number(),
  deleted_images: z.number(),
})

/**
 * The create body. `company_id` is the only field the API insists on; everything
 * else is optional and an omitted key is simply not stored.
 */
export interface EmployeeBasicPayload {
  company_id?: number
  prefix: string | null
  name: string | null
  photo: string | null
  gender: string | null
  birth_date: string | null
  marital_status: string | null
  relation: string | null
  relative_name: string | null

  current_address1: string | null
  current_address2: string | null
  current_address3: string | null
  current_country: string | null
  current_state_id: number | null
  current_district_id: number | null
  current_taluka: string | null
  current_city: string | null
  current_pin_code: string | null

  permanent_address1: string | null
  permanent_address2: string | null
  permanent_address3: string | null
  permanent_country: string | null
  permanent_state_id: number | null
  permanent_district_id: number | null
  permanent_taluka: string | null
  permanent_city: string | null
  permanent_pin_code: string | null

  mobile_number1: string | null
  mobile_number2: string | null
  landline_number: string | null
  email: string | null

  blood_group: string | null
  height: string | null
  height_unit: string | null
  weight: string | null
  weight_unit: string | null
  is_disability: boolean
  remarks: string | null

  branch_id: number | null
  department_id: number | null
  designation_id: number | null
  grade: string | null
  employment_type: string | null
  contract_period: number | null
  contract_period_type: string | null
  joining_date: string | null
  confirmation_date: string | null
  renewal_date: string | null
  is_police_verified: boolean
  is_stamp_agreement: boolean
  leaving_date: string | null
  leaving_reason: string | null
}

/** The edit body — the same fields, minus the tenant, which can't be moved. */
export type EmployeeBasicUpdatePayload = Omit<EmployeeBasicPayload, 'company_id'>

/* ── Step 2 — KYC ────────────────────────────────────────────────────────── */

/**
 * KYC. Aadhaar and the bank block are required because payroll can't run without
 * them; the rest of the identity documents are recorded when the employee
 * produces them.
 */
export const employeeKycSchema = z
  .object({
    pfNumber: z.string().trim().max(50, 'Cannot exceed 50 characters'),
    uanNumber: uanField(),
    esicNumber: esicNumberField(),

    bankId: z.string().trim().min(1, 'Please select a bank'),
    bankAccountNumber: accountNumberField({ required: true }),
    bankBranchName: recordNameField('the branch name', { required: false, max: 150 }),
    ifscCode: ifscField({ required: true }),

    aadharNumber: aadhaarField({ required: true }),
    nameAsPerAadhar: personNameField('the name as per Aadhaar'),
    panNumber: panField(),
    epicNumber: z.string().trim().max(50, 'Cannot exceed 50 characters'),
    rationCardNumber: z.string().trim().max(50, 'Cannot exceed 50 characters'),

    drivingLicenceNumber: z.string().trim().max(50, 'Cannot exceed 50 characters'),
    drivingLicenceExpiryDate: z.string(),

    passportNumber: optionalPattern(
      /^[A-Z][0-9]{7}$/,
      'Enter a valid passport number, e.g. A1234567',
    ),
    passportValidFrom: z.string(),
    passportValidTo: z.string(),
  })
  // The endpoint enforces no cross-date rule, so the form does.
  .refine(
    (v) => !v.passportValidFrom || !v.passportValidTo || v.passportValidTo >= v.passportValidFrom,
    { path: ['passportValidTo'], message: '"Valid to" cannot be before "valid from"' },
  )
  .refine((v) => !v.drivingLicenceExpiryDate || v.drivingLicenceNumber.trim() !== '', {
    path: ['drivingLicenceNumber'],
    message: 'Please enter the licence number',
  })
  .refine((v) => (!v.passportValidFrom && !v.passportValidTo) || v.passportNumber.trim() !== '', {
    path: ['passportNumber'],
    message: 'Please enter the passport number',
  })

export type EmployeeKycFormValues = z.infer<typeof employeeKycSchema>

export const employeeKycResponseSchema = z.object({
  employee_id: z.number(),
  pf_number: z.string().nullish(),
  uan_number: z.string().nullish(),
  esic_number: z.string().nullish(),
  bank_id: z.number().nullish(),
  bank_account_number: z.string().nullish(),
  bank_branch_name: z.string().nullish(),
  ifsc_code: z.string().nullish(),
  aadhar_number: z.string().nullish(),
  name_as_per_aadhar: z.string().nullish(),
  pan_number: z.string().nullish(),
  epic_number: z.string().nullish(),
  ration_card_number: z.string().nullish(),
  driving_licence_number: z.string().nullish(),
  driving_licence_expiry_date: z.string().nullish(),
  passport_number: z.string().nullish(),
  passport_valid_from: z.string().nullish(),
  passport_valid_to: z.string().nullish(),
})

export type EmployeeKycResponse = z.infer<typeof employeeKycResponseSchema>

/**
 * The KYC body, shared by the first save and every edit. POST is a full
 * overwrite (an omitted key is stored as `null`) and PATCH is partial, but the
 * form always submits every field — so one body serves both.
 */
export interface EmployeeKycPayload {
  pf_number: string | null
  uan_number: string | null
  esic_number: string | null
  bank_id: number | null
  bank_account_number: string | null
  bank_branch_name: string | null
  ifsc_code: string | null
  aadhar_number: string | null
  name_as_per_aadhar: string | null
  pan_number: string | null
  epic_number: string | null
  ration_card_number: string | null
  driving_licence_number: string | null
  driving_licence_expiry_date: string | null
  passport_number: string | null
  passport_valid_from: string | null
  passport_valid_to: string | null
}

/* ── Step 3 — the inherited wage structure ───────────────────────────────── */

export const employeeWageComponentResponseSchema = z.object({
  pay_component_id: z.number(),
  component_type: z.string().nullish(),
  sort_order: z.number(),
  amount: z.number(),
  amount_type: z.string(),
  pf_applicable: z.boolean().nullish(),
  esic_applicable: z.boolean().nullish(),
  pt_applicable: z.boolean().nullish(),
})

export const employeeWageStructureResponseSchema = z.object({
  employee_id: z.number(),
  employee_service_id: z.number(),
  designation_id: z.number().nullish(),
  designation_wage_structure_id: z.number().nullish(),
  applicable_date: z.string().nullish(),
  salary_type: z.string().nullish(),
  wages_per_day: z.number().nullish(),
  basic_pay: z.number().nullish(),
  working_day_calculation_type: z.string().nullish(),
  working_days: z.number().nullish(),
  extra_day_amount_per_day: z.number().nullish(),
  weekly_off: z.string().nullish(),

  is_pf_act_applicable: z.boolean().nullish(),
  pf_deduction_type: z.string().nullish(),
  pf_deduction_amount: z.number().nullish(),
  is_employee_pf_contribution_on_wage_limit: z.boolean().nullish(),
  is_employer_pf_contribution_on_wage_limit: z.boolean().nullish(),

  is_esic_act_applicable: z.boolean().nullish(),
  esic_deduction_basis: z.string().nullish(),
  esic_start_date: z.string().nullish(),

  is_pt_act_applicable: z.boolean().nullish(),
  pt_act_type: z.string().nullish(),
  pt_amount: z.number().nullish(),

  is_lwf_act_applicable: z.boolean().nullish(),
  is_lwf_deduct_from_wages: z.boolean().nullish(),
  lwf_act_type: z.string().nullish(),
  lwf_amount: z.number().nullish(),

  is_overtime_applicable: z.boolean().nullish(),
  overtime_rate_per_hour: z.number().nullish(),
  is_pf_applicable_on_overtime: z.boolean().nullish(),
  is_esic_applicable_on_overtime: z.boolean().nullish(),
  is_pt_applicable_on_overtime: z.boolean().nullish(),

  is_tds_act_applicable: z.boolean().nullish(),
  is_disability: z.boolean().nullish(),

  salary_components: z.array(employeeWageComponentResponseSchema).nullish(),
})

export type EmployeeWageStructureResponse = z.infer<
  typeof employeeWageStructureResponseSchema
>


/* ── Repeatable row lists ────────────────────────────────────────────────── */

/**
 * The row lists behind steps 4 to 7.
 *
 * Each of those steps is a card list with one Save, over an API that writes one
 * row per call — so the form holds `{ rows: [...] }` and the step's save diffs it
 * (see `lib/save-rows.ts`). Two consequences shape the schemas below:
 *
 * - **A row carries its server `id`** when it came back from a read, and doesn't
 *   when the user just added it. That is what tells a POST from a PATCH.
 * - **A blank row is legal — unless it's the only one.** The list always keeps one
 *   card on screen so there's something to type into, so an *extra* untouched card
 *   is skipped by both the rules and the save: validating it would block the step,
 *   saving it would create a junk record. But a list where *every* card is blank has
 *   recorded nothing, and the step must not pass — so the first card is held to the
 *   full rules there, which marks every missing answer at once rather than one
 *   field at a time (`rowNeedsRules`).
 *
 * The refine reports issues at `[index, 'field']`, which zod prefixes with the
 * array's own path — so react-hook-form receives `rows.2.fullName` and the message
 * lands under the right control in the right card.
 */

/** Is every one of `keys` blank on this row? */
function rowIsBlank(row: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => {
    const value = row[key]
    return value === undefined || value === null || String(value).trim() === ''
  })
}

/**
 * Do this row's field rules run?
 *
 * Yes for any row with something in it, and yes for the first card of an all-blank
 * list — that list has recorded nothing, and reporting every required field of card
 * one is how the step says so. An extra blank card alongside a filled one is
 * skipped: it's the empty card the list always keeps on screen.
 */
function rowNeedsRules<TRow extends Record<string, unknown>>(
  rows: readonly TRow[],
  index: number,
  keys: readonly string[],
): boolean {
  if (!rowIsBlank(rows[index], keys)) return true
  return index === 0 && rows.every((row) => rowIsBlank(row, keys))
}

/** The server id a saved row carries; absent on one the user just added. */
const rowId = z.number().optional()

/* ── Step 4 — family ─────────────────────────────────────────────────────── */

/** One family member. Nothing is required at field level — see `rowIsBlank`. */
export const employeeFamilyRowSchema = z.object({
  id: rowId,
  fullName: z.string(),
  relation: z.string(),
  birthDate: z.string(),
  aadharNumber: z.string(),
  isNominee: z.boolean(),
})

export type EmployeeFamilyFormValues = z.infer<typeof employeeFamilyRowSchema>

/** What makes a family row real — a row with none of these is skipped. */
export const FAMILY_ROW_KEYS = [
  'fullName',
  'relation',
  'birthDate',
  'aadharNumber',
] as const

export const employeeFamilyListSchema = z.object({
  rows: z.array(employeeFamilyRowSchema).superRefine((rows, ctx) => {
    const today = new Date().toISOString().slice(0, 10)

    rows.forEach((row, index) => {
      if (!rowNeedsRules(rows, index, FAMILY_ROW_KEYS)) return

      const name = row.fullName.trim()
      if (name === '') {
        ctx.addIssue({ code: 'custom', path: [index, 'fullName'], message: 'Please enter the name' })
      } else if (name.length < 2) {
        ctx.addIssue({ code: 'custom', path: [index, 'fullName'], message: 'Minimum 2 characters' })
      } else if (!PERSON_NAME_RE.test(name)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'fullName'],
          message: "A name can only use letters, spaces and . ' -",
        })
      }

      if (row.relation.trim() === '') {
        ctx.addIssue({ code: 'custom', path: [index, 'relation'], message: 'Please select a relation' })
      }

      if (row.birthDate && row.birthDate > today) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'birthDate'],
          message: 'Date of birth cannot be in the future',
        })
      }

      const aadhar = row.aadharNumber.trim()
      if (aadhar !== '' && !AADHAAR_RE.test(aadhar)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'aadharNumber'],
          message: 'Aadhaar number must be 12 digits',
        })
      }
    })
  }),
})

export type EmployeeFamilyListFormValues = z.infer<typeof employeeFamilyListSchema>

export const employeeFamilyResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number().nullish(),
  full_name: z.string().nullish(),
  relation: z.string().nullish(),
  birth_date: z.string().nullish(),
  aadhar_number: z.string().nullish(),
  is_nominee: z.boolean().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeFamilyResponse = z.infer<typeof employeeFamilyResponseSchema>

export const employeeFamilyListResponseSchema = z.object({
  items: z.array(employeeFamilyResponseSchema),
  total: z.number(),
})

export interface EmployeeFamilyPayload {
  full_name: string
  relation: string | null
  birth_date: string | null
  aadhar_number: string | null
  is_nominee: boolean
}

/* ── Step 5a — education ─────────────────────────────────────────────────── */

export const employeeEducationRowSchema = z.object({
  id: rowId,
  educationName: z.string(),
  board: z.string(),
  passingYear: z.string(),
  percentage: z.string(),
})

export type EmployeeEducationFormValues = z.infer<typeof employeeEducationRowSchema>

/** What makes an education row real. */
export const EDUCATION_ROW_KEYS = [
  'educationName',
  'board',
  'passingYear',
  'percentage',
] as const

const PERCENTAGE_RE = /^\d{1,3}(\.\d{1,2})?$/

/** Per-row rules, shared by the education list and reused by the step's form. */
function refineEducationRows(rows: EmployeeEducationFormValues[], ctx: z.RefinementCtx) {
  rows.forEach((row, index) => {
    if (!rowNeedsRules(rows, index, EDUCATION_ROW_KEYS)) return

    const qualification = row.educationName.trim()
    if (qualification === '') {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'educationName'],
        message: 'Please enter the qualification',
      })
    } else if (!RECORD_NAME_RE.test(qualification)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'educationName'],
        message: 'A qualification must contain at least one letter',
      })
    }

    const board = row.board.trim()
    if (board !== '' && !RECORD_NAME_RE.test(board)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'board'],
        message: 'A board name must contain at least one letter',
      })
    }
    if (row.passingYear.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'passingYear'],
        message: 'Please select the passing year',
      })
    }

    const percentage = row.percentage.trim()
    if (percentage !== '') {
      if (!PERCENTAGE_RE.test(percentage)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'percentage'],
          message: 'Enter a percentage, e.g. 78 or 78.5',
        })
      } else if (Number(percentage) > 100) {
        ctx.addIssue({ code: 'custom', path: [index, 'percentage'], message: 'Cannot exceed 100' })
      }
    }
  })
}

export const employeeEducationResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number().nullish(),
  education_name: z.string().nullish(),
  board: z.string().nullish(),
  passing_year: z.string().nullish(),
  percentage: z.string().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeEducationResponse = z.infer<typeof employeeEducationResponseSchema>

export const employeeEducationListResponseSchema = z.object({
  items: z.array(employeeEducationResponseSchema),
  total: z.number(),
})

export interface EmployeeEducationPayload {
  education_name: string
  passing_year: string
  board: string | null
  percentage: string | null
}

/* ── Step 5b — experience ────────────────────────────────────────────────── */

/**
 * Prior employment. Both dates are months — the API rejects a full date.
 *
 * The list itself lives on the step-5 form alongside education, since the two are
 * captured together; `isFresher` is a UI flag that hides and skips this half.
 */
export const employeeExperienceRowSchema = z.object({
  id: rowId,
  companyName: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  designation: z.string(),
  salary: z.string(),
  /** What `salary` is quoted for. Blank means the row doesn't say. */
  ctcType: z.enum(['', 'MONTHLY', 'YEARLY']),
  leavingReason: z.string(),
  contactPersonName: z.string(),
  contactPersonNumber: z.string(),
  contactPersonEmail: z.string(),
  /**
   * The verification block moves as a unit — the API refuses a remark nobody
   * signed, and clears the verifier when the switch goes off.
   */
  isVerified: z.boolean(),
  verificationReview: z.string(),
  /** Read-only, seeded from the list read so the card can name the verifier. */
  verifiedByName: z.string(),
})

export type EmployeeExperienceFormValues = z.infer<typeof employeeExperienceRowSchema>

/** What makes an experience row real. */
export const EXPERIENCE_ROW_KEYS = [
  'companyName',
  'fromDate',
  'toDate',
  'designation',
  'salary',
  'ctcType',
  'leavingReason',
  'contactPersonName',
  'contactPersonNumber',
  'contactPersonEmail',
] as const

/** Per-row rules for prior employment. */
function refineExperienceRows(
  rows: EmployeeExperienceFormValues[],
  ctx: z.RefinementCtx,
) {
  rows.forEach((row, index) => {
    if (!rowNeedsRules(rows, index, EXPERIENCE_ROW_KEYS)) return

    const company = row.companyName.trim()
    if (company === '') {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'companyName'],
        message: 'Please enter the company name',
      })
    } else if (!RECORD_NAME_RE.test(company)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'companyName'],
        message: 'A company name must contain at least one letter',
      })
    }

    const designation = row.designation.trim()
    if (designation === '') {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'designation'],
        message: 'Please enter the designation',
      })
    } else if (!RECORD_NAME_RE.test(designation)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'designation'],
        message: 'A designation must contain at least one letter',
      })
    }

    const contactPerson = row.contactPersonName.trim()
    if (contactPerson !== '' && !PERSON_NAME_RE.test(contactPerson)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'contactPersonName'],
        message: "A name can only use letters, spaces and . ' -",
      })
    }

    // The API takes `YYYY-MM` and nothing else, so both ends are month values.
    if (!MONTH_RE.test(row.fromDate)) {
      ctx.addIssue({ code: 'custom', path: [index, 'fromDate'], message: 'Pick a from month' })
    }
    if (!MONTH_RE.test(row.toDate)) {
      ctx.addIssue({ code: 'custom', path: [index, 'toDate'], message: 'Pick a to month' })
    } else if (MONTH_RE.test(row.fromDate) && row.toDate < row.fromDate) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'toDate'],
        // The endpoint enforces no ordering, so the form does.
        message: '"To" month cannot be before the "from" month',
      })
    }

    const salary = row.salary.trim()
    if (salary !== '' && !AMOUNT_RE.test(salary)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'salary'],
        message: 'Enter an amount, e.g. 25000',
      })
    }

    const contact = row.contactPersonNumber.trim()
    if (contact !== '' && !MOBILE_RE.test(contact)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'contactPersonNumber'],
        message: 'Enter a valid 10-digit mobile number',
      })
    }

    const contactEmail = row.contactPersonEmail.trim()
    if (contactEmail !== '' && !EMAIL_RE.test(contactEmail)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'contactPersonEmail'],
        message: 'Enter a valid email address',
      })
    } else if (contactEmail.length > 255) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'contactPersonEmail'],
        message: 'Keep the email address under 255 characters',
      })
    }

    /*
     * A remark nobody signed is a 400 on the API — the switch is what authorises
     * it — so the form refuses it here rather than letting the save fail.
     */
    if (!row.isVerified && row.verificationReview.trim() !== '') {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'verificationReview'],
        message: 'Turn Verified on before recording what the verifier said',
      })
    }
    if (row.verificationReview.trim().length > 2000) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'verificationReview'],
        message: 'Keep the review under 2000 characters',
      })
    }
  })
}

/**
 * Step 5's whole form: both collections plus the fresher flag. One schema, because
 * one Save covers both halves of the screen.
 */
export const employeeEducationStepSchema = z.object({
  educations: z.array(employeeEducationRowSchema).superRefine(refineEducationRows),
  /** UI-only: while on, the experience rows are hidden and never validated or sent. */
  isFresher: z.boolean(),
  experiences: z.array(employeeExperienceRowSchema),
})

export type EmployeeEducationStepFormValues = z.infer<typeof employeeEducationStepSchema>

/**
 * The same schema with the experience half enforced — used when the fresher switch
 * is off. Kept as a separate resolver rather than a conditional refine so the rules
 * genuinely don't run for a fresher.
 */
export const employeeEducationStepWithExperienceSchema = z.object({
  educations: z.array(employeeEducationRowSchema).superRefine(refineEducationRows),
  isFresher: z.boolean(),
  experiences: z.array(employeeExperienceRowSchema).superRefine(refineExperienceRows),
})

export const employeeExperienceResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number().nullish(),
  company_name: z.string().nullish(),
  from_date: z.string().nullish(),
  to_date: z.string().nullish(),
  designation: z.string().nullish(),
  salary: z.string().nullish(),
  leaving_reason: z.string().nullish(),
  contact_person_name: z.string().nullish(),
  contact_person_number: z.string().nullish(),
  contact_email: z.string().nullish(),
  ctc_type: z.enum(['MONTHLY', 'YEARLY']).nullish(),
  is_verified: z.boolean().nullish(),
  /** A `users.id`. Stamped by the API from the caller — never sent by us. */
  verified_by: z.number().nullish(),
  verification_review: z.string().nullish(),
  /** List rows only — the single-row GET resolves no name. */
  verified_by_name: z.string().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeExperienceResponse = z.infer<typeof employeeExperienceResponseSchema>

export const employeeExperienceListResponseSchema = z.object({
  items: z.array(employeeExperienceResponseSchema),
  total: z.number(),
})

/**
 * The experience body. `verified_by` is deliberately absent: the API stamps the
 * logged-in user whenever `is_verified: true` arrives, so nobody can attribute a
 * verification to a colleague.
 */
export interface EmployeeExperiencePayload {
  company_name: string
  from_date: string
  to_date: string
  designation: string
  salary: string | null
  ctc_type: 'MONTHLY' | 'YEARLY' | null
  leaving_reason: string | null
  contact_person_name: string | null
  contact_person_number: string | null
  contact_email: string | null
  is_verified: boolean
  verification_review: string | null
}

/* ── Step 6 — documents ──────────────────────────────────────────────────── */

/**
 * One attachment. `document` holds the object key the presigned upload returned,
 * which is why it's a required string: a row with no file behind it is rejected
 * by the API and would show as an empty attachment in the list.
 */
export const employeeDocumentRowSchema = z.object({
  id: rowId,
  documentTypeId: z.string(),
  documentId: z.string(),
  expiryDate: z.string(),
  /** The object key the presigned upload returned — never the file itself. */
  document: z.string(),
})

export type EmployeeDocumentFormValues = z.infer<typeof employeeDocumentRowSchema>

/** What makes a document row real. */
export const DOCUMENT_ROW_KEYS = [
  'documentTypeId',
  'documentId',
  'expiryDate',
  'document',
] as const

export const employeeDocumentListSchema = z.object({
  rows: z.array(employeeDocumentRowSchema).superRefine((rows, ctx) => {
    rows.forEach((row, index) => {
      if (!rowNeedsRules(rows, index, DOCUMENT_ROW_KEYS)) return

      if (row.documentTypeId.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'documentTypeId'],
          message: 'Please select a document type',
        })
      }
      if (row.documentId.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'documentId'],
          message: 'Please select a document',
        })
      }
      // The API rejects a row with no file behind it, and an attachment without
      // one would show as an empty entry — so the upload is what makes it savable.
      if (row.document.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'document'],
          message: 'Please upload the file',
        })
      }
    })
  }),
})

export type EmployeeDocumentListFormValues = z.infer<typeof employeeDocumentListSchema>

export const employeeDocumentResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number().nullish(),
  document_type_id: z.number().nullish(),
  document_type_name: z.string().nullish(),
  document_id: z.number().nullish(),
  document_name: z.string().nullish(),
  expiry_date: z.string().nullish(),
  document: z.string().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeDocumentResponse = z.infer<typeof employeeDocumentResponseSchema>

export const employeeDocumentListResponseSchema = z.object({
  items: z.array(employeeDocumentResponseSchema),
  total: z.number(),
})

export interface EmployeeDocumentPayload {
  document_type_id: number
  document_id: number
  document: string
  expiry_date: string | null
}

/* ── Step 7 — assets ─────────────────────────────────────────────────────── */

export const employeeAssetRowSchema = z.object({
  id: rowId,
  assetId: z.string(),
  status: z.string(),
  assignedDate: z.string(),
  validTill: z.string(),
  remarks: z.string(),
})

export type EmployeeAssetFormValues = z.infer<typeof employeeAssetRowSchema>

/**
 * What makes an asset row real.
 *
 * `status` is deliberately absent: a blank row opens on `ASSIGNED`, so counting it
 * would make every empty card look filled in.
 */
export const ASSET_ROW_KEYS = ['assetId', 'assignedDate', 'validTill', 'remarks'] as const

export const employeeAssetListSchema = z.object({
  rows: z.array(employeeAssetRowSchema).superRefine((rows, ctx) => {
    rows.forEach((row, index) => {
      if (!rowNeedsRules(rows, index, ASSET_ROW_KEYS)) return

      if (row.assetId.trim() === '') {
        ctx.addIssue({ code: 'custom', path: [index, 'assetId'], message: 'Please select an asset' })
      }
      if (row.status.trim() === '') {
        ctx.addIssue({ code: 'custom', path: [index, 'status'], message: 'Please select a status' })
      }
      if (row.assignedDate && row.validTill && row.validTill < row.assignedDate) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'validTill'],
          message: '"Valid till" cannot be before the assigned date',
        })
      }
    })
  }),
})

export type EmployeeAssetListFormValues = z.infer<typeof employeeAssetListSchema>

export const employeeAssetResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number().nullish(),
  asset_id: z.number().nullish(),
  asset_name: z.string().nullish(),
  assigned_date: z.string().nullish(),
  valid_till: z.string().nullish(),
  status: z.string().nullish(),
  remarks: z.string().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeAssetResponse = z.infer<typeof employeeAssetResponseSchema>

export const employeeAssetListResponseSchema = z.object({
  items: z.array(employeeAssetResponseSchema),
  total: z.number(),
})

export interface EmployeeAssetPayload {
  asset_id: number
  status: string
  assigned_date: string | null
  valid_till: string | null
  remarks: string | null
}

/* ── Step 8 — transfers ──────────────────────────────────────────────────── */

/**
 * A transfer: the leaving details that close the current posting plus the full
 * terms of the new one. The destination company is picked directly — the API's
 * `transfer_type` is derived from whether it differs from the company being
 * left, so there is no separate "kind of move" question to answer.
 */
export const employeeTransferSchema = z
  .object({
    leavingDate: z.string().trim().min(1, 'Please select the leaving date'),
    leavingReason: z
      .string()
      .trim()
      .min(1, 'Please enter the leaving reason')
      .max(500, 'Cannot exceed 500 characters'),

    companyId: z.string().trim().min(1, 'Please select the company'),

    branchId: z.string(),
    departmentId: z.string(),
    designationId: z.string().trim().min(1, 'Please select a designation'),
    grade: z.string().trim().min(1, 'Please select a grade'),
    employmentType: z.string().trim().min(1, 'Please select an employment type'),
    contractPeriod: z.string(),
    contractPeriodType: z.string(),
    joiningDate: z.string().trim().min(1, 'Please select the new joining date'),
    confirmationDate: z.string().trim().min(1, 'Please select the confirmation date'),
    renewalDate: z.string(),
  })
  // The new posting has to start after the old one closed, never on the same day.
  .refine((v) => !v.leavingDate || !v.joiningDate || v.joiningDate > v.leavingDate, {
    path: ['joiningDate'],
    message: 'The new joining date must be after the leaving date',
  })
  .refine((v) => !v.joiningDate || !v.confirmationDate || v.confirmationDate >= v.joiningDate, {
    path: ['confirmationDate'],
    message: 'Confirmation date cannot be before the joining date',
  })
  .refine(
    (v) => v.employmentType === PERMANENT_EMPLOYMENT_TYPE || v.contractPeriod.trim() !== '',
    { path: ['contractPeriod'], message: 'Please enter the contract period' },
  )

export type EmployeeTransferFormValues = z.infer<typeof employeeTransferSchema>

/**
 * The restricted edit of the latest posting — a correction, not a move: no
 * leaving details and nothing being closed.
 *
 * The three dates aren't asked for either: the dialog corrects *where* the
 * posting sits, not when it ran. They stay in the form, seeded from the record
 * and written back untouched, which is why none of them is required here — a
 * posting saved without a confirmation date would otherwise be unsubmittable
 * against a field the user can't see.
 */
export const employeeServiceEditSchema = z
  .object({
    branchId: z.string(),
    departmentId: z.string(),
    designationId: z.string().trim().min(1, 'Please select a designation'),
    grade: z.string().trim().min(1, 'Please select a grade'),
    employmentType: z.string().trim().min(1, 'Please select an employment type'),
    contractPeriod: z.string(),
    contractPeriodType: z.string(),
    joiningDate: z.string(),
    confirmationDate: z.string(),
    renewalDate: z.string(),
  })
  .refine(
    (v) => v.employmentType === PERMANENT_EMPLOYMENT_TYPE || v.contractPeriod.trim() !== '',
    { path: ['contractPeriod'], message: 'Please enter the contract period' },
  )

export type EmployeeServiceEditFormValues = z.infer<typeof employeeServiceEditSchema>

/** Closing the open posting without opening another — the employee exits. */
export const leaveServiceSchema = z.object({
  leavingDate: z.string().trim().min(1, 'Please select the leaving date'),
  leavingReason: z
    .string()
    .trim()
    .min(1, 'Please enter the leaving reason')
    .max(500, 'Cannot exceed 500 characters'),
})

export type LeaveServiceFormValues = z.infer<typeof leaveServiceSchema>

export const employeeTransferResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  company_name: z.string().nullish(),
  branch_id: z.number().nullish(),
  branch_name: z.string().nullish(),
  department_id: z.number().nullish(),
  department_name: z.string().nullish(),
  designation_id: z.number().nullish(),
  designation_name: z.string().nullish(),
  joining_date: z.string().nullish(),
  leaving_date: z.string().nullish(),
  is_current: z.boolean().nullish(),
  is_latest: z.boolean().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeTransferResponse = z.infer<typeof employeeTransferResponseSchema>

export const employeeTransferListResponseSchema = z.object({
  items: z.array(employeeTransferResponseSchema),
  total: z.number(),
})

export const employeeServiceDetailResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  company_name: z.string().nullish(),
  branch_id: z.number().nullish(),
  branch_name: z.string().nullish(),
  department_id: z.number().nullish(),
  department_name: z.string().nullish(),
  designation_id: z.number().nullish(),
  designation_name: z.string().nullish(),
  grade: z.string().nullish(),
  employment_type: z.string().nullish(),
  contract_period: z.number().nullish(),
  contract_period_type: z.string().nullish(),
  joining_date: z.string().nullish(),
  confirmation_date: z.string().nullish(),
  renewal_date: z.string().nullish(),
  leaving_date: z.string().nullish(),
  leaving_reason: z.string().nullish(),
  is_current: z.boolean().nullish(),
  is_latest: z.boolean().nullish(),
  is_police_verified: z.boolean().nullish(),
  is_stamp_agreement: z.boolean().nullish(),
})

export const employeeTransferWageStructureResponseSchema = z.object({
  designation_wage_structure_id: z.number().nullish(),
  salary_type: z.string().nullish(),
  basic_pay: z.number().nullish(),
  wages_per_day: z.number().nullish(),
  is_pf_act_applicable: z.boolean().nullish(),
  is_esic_act_applicable: z.boolean().nullish(),
  is_pt_act_applicable: z.boolean().nullish(),
  is_lwf_act_applicable: z.boolean().nullish(),
  is_overtime_applicable: z.boolean().nullish(),
  is_tds_act_applicable: z.boolean().nullish(),
  weekly_off: z.string().nullish(),
  is_disability: z.boolean().nullish(),
})

/** What every step 8 read and write answers with. */
export const employeeTransferDetailResponseSchema = z.object({
  wage_structure: employeeTransferWageStructureResponseSchema,
  service_detail: employeeServiceDetailResponseSchema,
})

export type EmployeeTransferDetailResponse = z.infer<
  typeof employeeTransferDetailResponseSchema
>

export interface EmployeeTransferPayload {
  leaving_date: string
  leaving_reason: string
  transfer_type: 'company' | 'branch'
  new_company_id?: number
  branch_id: number | null
  department_id: number | null
  designation_id: number
  grade: string
  employment_type: string
  contract_period: number | null
  contract_period_type?: string
  joining_date: string
  confirmation_date: string
  renewal_date: string | null
}

export interface EmployeeServiceEditPayload {
  branch_id: number | null
  department_id: number | null
  designation_id: number
  grade: string
  employment_type: string
  contract_period: number | null
  contract_period_type?: string
  joining_date: string
  confirmation_date: string
  renewal_date: string | null
}

export interface LeaveServicePayload {
  leaving_date: string
  leaving_reason: string
}

/* ── Step 9 — shift & roster ─────────────────────────────────────────────── */

/**
 * Put the employee on a shift from a date.
 *
 * Both cases go through this one form, and which one is meant is read off the
 * mode: a shift, or NO shift — the latter being how an assignment ends ("back to
 * the department or company default from this date"). The API takes the absence
 * of `shift_id` as that instruction, so "default" is a deliberate choice on the
 * form rather than an empty one.
 */
export const employeeShiftAssignmentSchema = z
  .object({
    /** Which kind of assignment is being written. */
    mode: z.enum(['shift', 'default']),
    /** A shift id as the dropdown's string; empty in the "default" mode. */
    shiftId: z.string().trim(),
    effectiveDate: z
      .string()
      .trim()
      .min(1, 'Effective date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date as YYYY-MM-DD'),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'shift' && !values.shiftId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shiftId'],
        message: 'Pick the shift to assign',
      })
    }
  })

export type EmployeeShiftAssignmentFormValues = z.infer<
  typeof employeeShiftAssignmentSchema
>

/** Override the employee's shift for one date. Both fields are required. */
export const employeeRosterSchema = z.object({
  workDate: z
    .string()
    .trim()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date as YYYY-MM-DD'),
  shiftId: z.string().trim().min(1, 'Pick the shift for this date'),
})

export type EmployeeRosterFormValues = z.infer<typeof employeeRosterSchema>

/** One entry of the assignment timeline as the API returns it. */
export const employeeShiftAssignmentResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  employee_service_id: z.number(),
  shift_id: z.number().nullish(),
  shift_name: z.string().nullish(),
  effective_date: z.string(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeShiftAssignmentResponse = z.infer<
  typeof employeeShiftAssignmentResponseSchema
>

/** `GET /user/employees/:id/shifts` — the whole timeline, newest first. */
export const employeeShiftAssignmentsResponseSchema = z.object({
  items: z.array(employeeShiftAssignmentResponseSchema),
  total: z.number(),
})

/** One roster override as the API returns it. */
export const employeeRosterEntryResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  employee_service_id: z.number(),
  work_date: z.string(),
  shift_id: z.number(),
  shift_name: z.string().nullish(),
  source_type: z.string(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type EmployeeRosterEntryResponse = z.infer<
  typeof employeeRosterEntryResponseSchema
>

/** `GET /user/employees/:id/roster` — one page of overrides inside a window. */
export const employeeRosterResponseSchema = z.object({
  items: z.array(employeeRosterEntryResponseSchema),
  total: z.number(),
})

/**
 * `GET /user/employees/:id/shift` — the resolved shift for one date.
 *
 * The nested shift is the full record, so it's parsed with the shift master's own
 * response schema rather than a copy of it. `source` is left as a plain string and
 * narrowed by the mapper: an unfamiliar link in the chain shouldn't fail the page.
 */
export const employeeShiftOnDayResponseSchema = z.object({
  day: z.string(),
  shift: shiftResponseSchema.nullable(),
  source: z.string().nullish(),
  is_week_off: z.boolean(),
  /**
   * Set only under a FLEXIBLE week-off policy, and when it is set neither
   * `is_week_off` nor an empty weekday list means "nothing is off" — the employee
   * simply hasn't taken their day yet.
   */
  weekoff_flexible_days: z.number().nullish(),
})

export type EmployeeShiftOnDayResponse = z.infer<
  typeof employeeShiftOnDayResponseSchema
>

/**
 * The assignment body. Sending NO shift is the meaningful way to end an
 * assignment, so `shift_id` is nullable — and `null` travels rather than the key
 * being dropped, to say it outright.
 */
export interface EmployeeShiftAssignmentPayload {
  shift_id: number | null
  effective_date: string
}

/** The roster body — re-posting the same date replaces its entry. */
export interface EmployeeRosterPayload {
  work_date: string
  shift_id: number
}
