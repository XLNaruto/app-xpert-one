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
 * One allowance head as configured on this designation. The head itself is
 * fixed — every head in the master gets a row — so only its value and act
 * markers are captured, and a blank value simply means it doesn't apply.
 */
const allowanceRowSchema = z.object({
  componentId: z.string().trim(),
  valueType: z.enum(['Percentage', 'Fixed']),
  amount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
  pfApplicable: z.boolean(),
  esicApplicable: z.boolean(),
  ptApplicable: z.boolean(),
})

/** One deduction head; there is nothing to configure — payroll sets the amount. */
const deductionRowSchema = z.object({
  componentId: z.string().trim(),
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

    // Overtime
    overtimeApplicable: z.boolean(),
    overtimeCalculationType: z.enum(['', 'Manual', 'As Per Calculation']),
    overtimeRatePerHour: optionalMatch(AMOUNT_RE, 'Enter a valid rate'),

    // Allowance / deduction heads
    allowances: z.array(allowanceRowSchema),
    deductions: z.array(deductionRowSchema),
  })
  /*
   * Only the designation name and basic pay are demanded. Every salary and act
   * setting is optional — a half-configured designation is allowed to save, and
   * a blank statutory amount falls back to the act's own rate setting at payroll
   * time. The head rows need no cross-field rules: the heads come from the
   * master, so none can repeat, and a blank value just means "doesn't apply".
   */

export type DesignationFormValues = z.infer<typeof designationSchema>
export type DesignationAllowanceRow = DesignationFormValues['allowances'][number]

/* ── Wage structure history ─────────────────────────────────────────────── */

/** One allowance head as valued in a draft wage structure row. */
const wageAllowanceRowSchema = z.object({
  head: z.string(),
  valueType: z.enum(['Percentage', 'Fixed']),
  amount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
  pfApplicable: z.boolean(),
  esicApplicable: z.boolean(),
  ptApplicable: z.boolean(),
})

/** One deduction head as valued in a draft wage structure row. */
const wageDeductionRowSchema = z.object({
  head: z.string(),
  valueType: z.enum(['Percentage', 'Fixed']),
  amount: optionalMatch(AMOUNT_RE, 'Enter a valid amount'),
})

/**
 * One new effective-dated wage structure row. Everything bar the effective
 * month and the wage the salary type asks for is optional — an act left off
 * simply doesn't apply, and its settings are dropped on save.
 */
export const wageStructureRowSchema = z
  .object({
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
    overtimeCalculationType: z.enum(['', 'Auto', 'Manual']),
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
  /*
   * The salary type decides which of the two wage figures is captured; the other
   * is derived and shown disabled, so only the captured one is demanded. Every
   * act setting stays optional — a half-configured row is allowed to save, and a
   * blank statutory amount falls back to the act's own rate at payroll time.
   */
  .superRefine((row, ctx) => {
    if (row.salaryType === 'Monthly' && row.basicPay === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['basicPay'],
        message: 'Basic pay is required for a monthly wage',
      })
    }
    if (row.salaryType === 'Daily' && row.wagePerDay === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['wagePerDay'],
        message: 'Wage per day is required for a daily wage',
      })
    }
  })

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
