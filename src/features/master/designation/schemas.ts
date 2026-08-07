import { z } from 'zod'

/** Amount with up to two decimals. */
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/
const DIGITS_RE = /^\d+$/

/** Every optional dropdown / free-text field on the designation form. */
const text = z.string().trim()

/** Passes when the value is blank (optional field) or matches `re`. */
const optionalMatch = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || re.test(v), message)

/**
 * One head as configured on this designation. The head itself is fixed — every
 * head in the master gets a row — so only its value and act markers are
 * captured, and a blank value simply means it doesn't apply.
 *
 * Both sides of the form take this shape, because the API takes both sides as one
 * `salary_components` array with one shape: a head's own `type` in the
 * pay-component catalog decides which side it lands on, and the request never
 * says which.
 */
const componentRowSchema = z.object({
  componentId: z.string().trim(),
  valueType: z.enum(['Percentage', 'Fixed']),
  amount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
  pfApplicable: z.boolean(),
  esicApplicable: z.boolean(),
  ptApplicable: z.boolean(),
})

/**
 * Create/edit form for a designation master record. Covers the whole screen:
 * the designation identity, its salary configuration, every applicable act and
 * the allowance / deduction heads attached to it.
 */
export const designationSchema = z
  .object({
    // Designation detail
    designationName: z.string().trim().min(1, 'Designation name is required'),

    // Salary configuration
    salaryType: text,
    basicPay: z
      .string()
      .trim()
      .min(1, 'Basic pay is required')
      .refine((v) => AMOUNT_RE.test(v), 'Enter a valid amount'),
    workingDayCalculationType: z.enum(['', 'Fixed', 'As Per Calculation']),
    workingDays: optionalMatch(DIGITS_RE, 'Enter a whole number'),
    weeklyOff: text,
    extraDayAmountPerDay: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),

    // PF act
    pfActApplicable: z.boolean(),
    pfDeductionType: z.enum(['', 'Fixed', 'Percentage']),
    /** Read as a percentage or a rupee amount, per `pfDeductionType`. */
    pfDeductionValue: optionalMatch(AMOUNT_RE, 'Enter a valid value'),
    employeePfContributionOnWageLimit: z.boolean(),
    employerPfContributionOnWageLimit: z.boolean(),

    // ESIC act
    esicActApplicable: z.boolean(),
    esicDeductionBasis: text,

    // Professional tax act
    ptActApplicable: z.boolean(),
    ptActType: z.enum(['', 'As Per Act', 'Manual']),
    ptAmount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),

    // Labour welfare fund act
    lwfActApplicable: z.boolean(),
    lwfActType: z.enum(['', 'As Per Act', 'Manual']),
    lwfAmount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),

    // Overtime — a rate entered here is what's paid; left blank it's derived.
    overtimeApplicable: z.boolean(),
    overtimeRatePerHour: optionalMatch(AMOUNT_RE, 'Enter a valid rate'),

    // Allowance / deduction heads
    allowances: z.array(componentRowSchema),
    deductions: z.array(componentRowSchema),
  })
  /*
   * Only the designation name and basic pay are demanded. Every salary and act
   * setting is optional — a half-configured designation is allowed to save, and
   * a blank statutory amount falls back to the act's own rate setting at payroll
   * time. The head rows need no cross-field rules: the heads come from the
   * master, so none can repeat, and a blank value just means "doesn't apply".
   */

export type DesignationFormValues = z.infer<typeof designationSchema>
/** One head row on the form — the same shape on either side. */
export type DesignationComponentRow = DesignationFormValues['allowances'][number]

/**
 * The edit screen's Basic Info tab. `PATCH /user/designations/:id` owns the
 * designation name and nothing else — everything else on the create form is
 * effective-dated and saved against a month on the Wage Structure tab — so the
 * tab is one field, and validating it as one keeps a rename from being blocked
 * by a pay setting it can't save anyway.
 */
export const designationBasicInfoSchema = designationSchema.pick({
  designationName: true,
})

export type DesignationBasicInfoValues = z.infer<typeof designationBasicInfoSchema>


/* ── Wage structure history ─────────────────────────────────────────────── */

/**
 * One allowance head as valued in a draft wage structure row. The head itself is
 * the master's record — `componentId` is its `pay_component_id`, which is how the
 * cell reaches the API's `salary_components` without a code lookup.
 */
const wageAllowanceRowSchema = z.object({
  componentId: z.number(),
  valueType: z.enum(['Percentage', 'Fixed']),
  amount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
  pfApplicable: z.boolean(),
  esicApplicable: z.boolean(),
  ptApplicable: z.boolean(),
})

/** One deduction head as valued in a draft wage structure row. */
const wageDeductionRowSchema = z.object({
  componentId: z.number(),
  valueType: z.enum(['Percentage', 'Fixed']),
  amount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
})

/**
 * Every field a wage structure row carries, before the cross-field rule below.
 *
 * Split out as a plain object schema because the HR bulk wage screen configures
 * the same forty columns on a row of its own — one per designation, against one
 * effective month for the whole screen — and builds its row by omitting the two
 * fields that are the history's alone (`wageStructureId`, `effectiveFrom`) and
 * adding the designation it belongs to. `.superRefine()` returns a `ZodEffects`,
 * which can't be reshaped, so the refinement is applied separately by each.
 */
export const wageStructureRowBaseSchema = z.object({
  /**
   * The stored version this row edits, when the user opened a saved row for
   * correction — a PATCH of that version rather than a new one. Absent on a
   * row drafted from scratch, which is a POST.
   *
   * Not called `id`: `useFieldArray` puts its own generated `id` on every field
   * entry, and a value field of that name would be shadowed by it.
   */
  wageStructureId: z.number().optional(),
  effectiveFrom: z.string().trim().min(1, 'Pick an effective month'),

  workingDayCalculationType: z.enum(['', 'Fixed', 'As Per Calculation']),
  weeklyOff: text,
  workingDays: optionalMatch(DIGITS_RE, 'Enter a whole number'),
  salaryType: z.enum(['Daily', 'Monthly']),
  /*
   * One of these two is captured and the other derived, per the salary type —
   * see the cross-field rule below. Both are optional here so the rule can say
   * which one is missing.
   */
  basicPay: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
  wagePerDay: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
  extraDayAmountPerDay: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),

  allowances: z.array(wageAllowanceRowSchema),
  deductions: z.array(wageDeductionRowSchema),

  overtimeApplicable: z.boolean(),
  overtimeRatePerHour: optionalMatch(AMOUNT_RE, 'Enter a valid rate'),

  pfActApplicable: z.boolean(),
  employeePfContributionOnWageLimit: z.boolean(),
  employerPfContributionOnWageLimit: z.boolean(),
  pfValueType: z.enum(['Percentage', 'Fixed']),
  pfValue: optionalMatch(AMOUNT_RE, 'Enter a valid value'),

  esicActApplicable: z.boolean(),
  esicDeductionBasis: text,

  ptActApplicable: z.boolean(),
  ptActType: z.enum(['', 'As Per Act', 'Manual']),
  ptAmount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),

  lwfActApplicable: z.boolean(),
  lwfActType: z.enum(['', 'As Per Act', 'Manual']),
  lwfAmount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
})

/**
 * The one cross-field rule every wage row obeys, wherever it's configured: the
 * salary type decides which of the two wage figures is captured, the other is
 * derived and shown disabled, so only the captured one is demanded. Answers
 * which field is missing, or `null` when the row is complete.
 *
 * Every act setting stays optional — a half-configured row is allowed to save,
 * and a blank statutory amount falls back to the act's own rate at payroll time.
 *
 * A plain predicate rather than a refinement, because the bulk wage screen has
 * to apply it to *some* of its rows: every designation of the company is on that
 * grid whether or not it has ever been configured, and only the rows actually
 * being saved are held to this. It runs it at submit time; the history tab, whose
 * rows are all being saved, wires it into the schema below.
 */
export function missingWageField(
  row: Pick<
    z.infer<typeof wageStructureRowBaseSchema>,
    'salaryType' | 'basicPay' | 'wagePerDay'
  >,
): { path: 'basicPay' | 'wagePerDay'; message: string } | null {
  if (row.salaryType === 'Monthly' && row.basicPay.trim() === '') {
    return { path: 'basicPay', message: 'Basic pay is required for a monthly wage' }
  }
  if (row.salaryType === 'Daily' && row.wagePerDay.trim() === '') {
    return { path: 'wagePerDay', message: 'Wage per day is required for a daily wage' }
  }
  return null
}

/**
 * One new effective-dated wage structure row, as the designation's history tab
 * captures it.
 */
export const wageStructureRowSchema = wageStructureRowBaseSchema.superRefine(
  (row, ctx) => {
    const missing = missingWageField(row)
    if (missing) {
      ctx.addIssue({ code: 'custom', path: [missing.path], message: missing.message })
    }
  },
)

/**
 * The wage structure tab's form — the rows being added this visit. Stored
 * history isn't part of it: rows are append-only, so nothing already saved is
 * editable and one submit only ever writes the drafts.
 */
export const wageStructureFormSchema = z.object({
  rows: z.array(wageStructureRowSchema).min(1, 'Add at least one row'),
})

export type WageStructureFormValues = z.infer<typeof wageStructureFormSchema>
export type WageStructureRow = WageStructureFormValues['rows'][number]

/* ── API shapes ─────────────────────────────────────────────────────────── */

/**
 * One allowance / deduction head as a wage structure carries it. The head's own
 * `type` in the pay-component catalog decides which side it belongs to —
 * `component_type` echoes it back on a read, and the request never says which.
 */
export const salaryComponentResponseSchema = z.object({
  id: z.number(),
  pay_component_id: z.number(),
  component_type: z.string().nullable(),
  sort_order: z.number(),
  amount: z.number(),
  amount_type: z.string(),
  pf_applicable: z.boolean().nullable(),
  esic_applicable: z.boolean().nullable(),
  pt_applicable: z.boolean().nullable(),
})

/**
 * One version of a designation's wage structure. The same object comes back
 * three ways — nested on the designation detail as the version in force, as a
 * history row, and as the row a save returns — so one schema covers all of them.
 * The audit columns only ride on the history shapes, hence optional.
 */
export const wageStructureResponseSchema = z.object({
  id: z.number(),
  applicable_date: z.string(),
  salary_type: z.string(),
  basic_pay: z.number().nullable(),
  wages_per_day: z.number().nullable(),
  working_day_calculation_type: z.string(),
  working_days: z.number().nullable(),
  weekly_off: z.string().nullable(),
  extra_day_amount_per_day: z.number().nullable(),

  is_pf_act_applicable: z.boolean().nullable(),
  pf_deduction_type: z.string().nullable(),
  pf_deduction_amount: z.number().nullable(),
  is_employee_pf_contribution_on_wage_limit: z.boolean().nullable(),
  is_employer_pf_contribution_on_wage_limit: z.boolean().nullable(),

  is_esic_act_applicable: z.boolean().nullable(),
  esic_deduction_basis: z.string().nullable(),

  is_pt_act_applicable: z.boolean().nullable(),
  pt_act_type: z.string().nullable(),
  pt_amount: z.number().nullable(),

  is_lwf_act_applicable: z.boolean().nullable(),
  lwf_act_type: z.string().nullable(),
  lwf_amount: z.number().nullable(),
  is_lwf_deduct_from_wages: z.boolean().nullable(),

  is_overtime_applicable: z.boolean(),
  overtime_rate_per_hour: z.number().nullable(),
  is_pf_applicable_on_overtime: z.boolean().nullable(),
  is_esic_applicable_on_overtime: z.boolean().nullable(),
  is_pt_applicable_on_overtime: z.boolean().nullable(),

  is_tds_act_applicable: z.boolean().nullable(),

  /** Absent on the version nested in the designation detail. */
  salary_components: z.array(salaryComponentResponseSchema).optional(),

  created_at: z.string().optional(),
  created_by_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
})

export type WageStructureResponse = z.infer<typeof wageStructureResponseSchema>

/**
 * One list row — `GET /user/designations` answers titles only, so there is no
 * pay on it at all. The salary configuration comes from the detail read.
 */
export const designationResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  created_at: z.string().optional(),
  created_by_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
})

export type DesignationResponse = z.infer<typeof designationResponseSchema>

export const designationsResponseSchema = z.object({
  items: z.array(designationResponseSchema),
  total: z.number(),
})

/**
 * `GET /user/designations/:id` — the title plus the wage structure in force and
 * the heads it was saved with. `wage_structure` is `null` on a designation that
 * has never been configured.
 */
export const designationDetailResponseSchema = designationResponseSchema.extend({
  wage_structure: wageStructureResponseSchema.nullable(),
  salary_components: z.array(salaryComponentResponseSchema),
})

export type DesignationDetailResponse = z.infer<typeof designationDetailResponseSchema>

/** `GET /user/designations/:id/wage-structures` — the version history, paged. */
export const wageStructuresResponseSchema = z.object({
  items: z.array(wageStructureResponseSchema),
  total: z.number(),
})

/** One head as a request body carries it — `amount` is optional. */
export interface SalaryComponentPayload {
  pay_component_id: number
  amount_type?: 'Percentage' | 'Fixed'
  amount?: number
  pf_applicable?: boolean
  esic_applicable?: boolean
  pt_applicable?: boolean
}

/**
 * The wage-structure half of a request body — shared by `POST /user/designations`
 * (which establishes the opening version alongside the title) and the two
 * wage-structure endpoints. Every field is optional: on a PATCH an omitted one
 * stays as stored, and on a POST it falls back to the version in force.
 */
export interface WageStructurePayload {
  working_day_calculation_type?: 'AUTO' | 'FIXED'
  weekly_off?: string | null
  working_days?: number | null
  salary_type?: 'DAILY' | 'MONTHLY'
  basic_pay?: number | null
  wages_per_day?: number | null
  extra_day_amount_per_day?: number | null

  is_overtime_applicable?: boolean
  overtime_rate_per_hour?: number | null

  is_pf_act_applicable?: boolean
  is_employee_pf_contribution_on_wage_limit?: boolean
  is_employer_pf_contribution_on_wage_limit?: boolean
  pf_deduction_type?: 'Percentage' | 'Fixed' | null
  pf_deduction_amount?: number | null

  is_esic_act_applicable?: boolean
  esic_deduction_basis?: 'Wage Ceiling' | 'Gross Salary' | 'As Per Act' | null

  is_pt_act_applicable?: boolean
  pt_act_type?: 'AUTO' | 'FIXED' | null
  pt_amount?: number | null

  is_lwf_act_applicable?: boolean
  lwf_act_type?: 'AUTO' | 'FIXED' | null
  lwf_amount?: number | null

  salary_components?: SalaryComponentPayload[]
}

/**
 * `POST /user/designations` — the title, the tenant and the opening wage
 * structure in one body.
 */
export interface DesignationPayload extends WageStructurePayload {
  company_id: number
  name: string
}

/** `PATCH /user/designations/:id` — the Basic Info tab owns the name alone. */
export interface DesignationUpdatePayload {
  name: string
}

/**
 * A body for either wage-structure write. `effective_from` is the version's
 * `YYYY-MM` month — required on a POST, and on a PATCH it corrects the month of
 * the row being edited.
 */
export interface WageStructureRowPayload extends WageStructurePayload {
  company_id: number
  effective_from: string
}
