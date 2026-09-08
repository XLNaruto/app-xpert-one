import { z } from 'zod'

/**
 * Wire schemas for the three `employee-contracts` calls, plus the two form
 * schemas behind the dialogs.
 *
 * Every date is a plain `yyyy-MM-dd` STRING and stays one. Nothing here parses a
 * date into a `Date`: the API sends no timestamps and no zone conversion is
 * needed, and reformatting one through UTC shifts the day for anyone whose
 * offset is negative.
 */

const contractStatusSchema = z.enum(['due', 'expired', 'upcoming'])
const periodTypeSchema = z.enum(['YEAR', 'MONTH', 'DAY'])

/** A `yyyy-MM-dd` the API may leave unset. */
const day = z.string().nullish()

export const expiringContractSchema = z.object({
  employee_id: z.number(),
  employee_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  employee_mobile: z.string().nullish(),
  service_id: z.number(),
  company_id: z.number().nullish(),
  company_name: z.string().nullish(),
  branch_name: z.string().nullish(),
  department_name: z.string().nullish(),
  designation_name: z.string().nullish(),
  grade: z.string().nullish(),
  joining_date: day,
  contract_period: z.number().nullish(),
  contract_period_type: periodTypeSchema.nullish(),
  contract_ends_on: day,
  renewal_due_on: day,
  days_to_end: z.number().nullish(),
  status: contractStatusSchema,
})

export const expiringContractsResponseSchema = z.object({
  items: z.array(expiringContractSchema),
  /** The size of the WORKLIST — rows matching the filter, not the workforce. */
  total: z.number(),
})

/** The one shape both actions answer with. */
export const contractPostingResponseSchema = z.object({
  employee_id: z.number(),
  service_id: z.number(),
  company_id: z.number().nullish(),
  employment_type: z.string().nullish(),
  contract_period: z.number().nullish(),
  contract_period_type: periodTypeSchema.nullish(),
  joining_date: day,
  contract_ends_on: day,
  renewal_due_on: day,
  days_to_end: z.number().nullish(),
  leaving_date: day,
  leaving_reason: z.string().nullish(),
  is_current: z.boolean(),
  status: contractStatusSchema,
})

export type ExpiringContractResponse = z.infer<typeof expiringContractSchema>
export type ExpiringContractsResponse = z.infer<typeof expiringContractsResponseSchema>
export type ContractPostingResponse = z.infer<typeof contractPostingResponseSchema>

/**
 * The renew dialog. Only the first two fields are asked for as a rule — they are
 * the same two inputs the Service Details section already carries, and most
 * renewals are for the same term.
 *
 * `effectiveFrom` is the escape hatch, not the norm: the API starts the new term
 * AT THE END OF THE ONE IN FORCE, so a one-year renewal of a contract ending
 * 14 Aug runs to 14 Aug next year whether it was signed in July or on the day.
 * Measuring from the moment somebody clicked would silently lengthen every
 * renewal by however late the paperwork was.
 */
export const contractRenewSchema = z.object({
  contractPeriod: z
    .string()
    .min(1, 'Contract period is required')
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      'Contract period must be a whole number greater than zero',
    ),
  contractPeriodType: periodTypeSchema,
  /** Blank = the API's default: the end of the term in force. */
  effectiveFrom: z.string().optional(),
  /** Blank = the new end minus the standard lead, which drops the row off. */
  renewalDate: z.string().optional(),
})

/**
 * The complete dialog. Both fields are optional to the API — `{}` is a valid
 * one-click call — so both are optional here and only sent when filled.
 */
export const contractCompleteSchema = z.object({
  /** Blank = `contract_ends_on`, or today when the term can't be placed. */
  leavingDate: z.string().optional(),
  leavingReason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
})

export type ContractRenewFormValues = z.infer<typeof contractRenewSchema>
export type ContractCompleteFormValues = z.infer<typeof contractCompleteSchema>

/** The renew body, as the endpoint spells it. */
export interface ContractRenewPayload {
  contract_period: number
  contract_period_type: string
  effective_from?: string
  renewal_date?: string
}

/** The complete body — every field optional. */
export interface ContractCompletePayload {
  leaving_date?: string
  leaving_reason?: string
}
