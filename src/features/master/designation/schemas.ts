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
