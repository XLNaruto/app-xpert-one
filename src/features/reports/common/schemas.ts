import { z } from 'zod'

/**
 * The envelope every report answers in.
 *
 * Read-only screens: there is no form on any of them, so there is no form schema
 * here — only what the endpoints answer and the pieces they all share.
 */

/**
 * `period` on a salary report — the month asked for, echoed back.
 *
 * The statutory reports send the resolved salary CYCLE with it (`from`, `to`,
 * `cycle_start_day`), which with a cycle start day set is not the calendar
 * month. Optional here rather than split into two near-identical schemas.
 */
export const reportPeriodSchema = z.object({
  month: z.number(),
  year: z.number(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  cycle_start_day: z.number().nullable().optional(),
})

/** `range` on Gross Salary — the only type read over more than one period. */
export const reportRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
  from_month: z.number(),
  from_year: z.number(),
  to_month: z.number(),
  to_year: z.number(),
})

/**
 * The PF reports' `basis` — the rate row the month was priced against, carried
 * so the screen prints what the figures were computed on rather than restating
 * the statutory defaults. `is_rate_on_file` false means no rate was configured
 * and the API fell back to them.
 */
export const pfBasisSchema = z.object({
  cycle_end: z.string().nullable(),
  wage_ceiling_limit: z.number().nullable(),
  edli_wage_ceiling_limit: z.number().nullable(),
  employee_pf_percentage: z.number().nullable(),
  employer_pf_contribution: z.number().nullable(),
  pension_rate: z.number().nullable(),
  pension_fund_age_limit: z.number().nullable(),
  is_rate_on_file: z.boolean(),
  rate_effective_date: z.string().nullable(),
})

/** The ESIC reports' `header` — the establishment and the rates in force. */
export const esicHeaderSchema = z.object({
  company_name: z.string().nullable(),
  department_name: z.string().nullable(),
  esic_code: z.string().nullable(),
  is_rate_on_file: z.boolean(),
  rate_effective_date: z.string().nullable(),
  wage_ceiling_limit: z.number().nullable(),
  employee_esic_contribution: z.number().nullable(),
  employer_esic_contribution: z.number().nullable(),
})

/**
 * PT's `header`. It carries no rates on purpose — PT is a slab table, so there
 * is no single rate to print. What it carries is the establishment the return is
 * filed by: the enrolment (EC) and registration (RC) numbers on the branch, null
 * when no department was selected or that department has no branch.
 */
export const ptHeaderSchema = z.object({
  company_name: z.string().nullable(),
  department_name: z.string().nullable(),
  pt_ec_number: z.string().nullable(),
  pt_rc_number: z.string().nullable(),
  pt_corporation_name: z.string().nullable(),
})

/** The two header tiles the payment reports carry, over the WHOLE filter. */
export const paymentMetricsSchema = z.object({
  total_employees: z.number(),
  total_net_pay: z.number(),
})

/**
 * `{ period, items, total }` around one type's own row — the shape eleven of the
 * twelve answer in. `extras` adds the envelope fields a family carries on top
 * (`basis` for PF, `header` for ESIC and PT, `metrics` for the payment reports).
 */
export function reportResponseSchema<TItem extends z.ZodTypeAny>(item: TItem) {
  return z.object({
    period: reportPeriodSchema,
    items: z.array(item),
    total: z.number(),
  })
}

export type ReportPeriodResponse = z.infer<typeof reportPeriodSchema>
export type ReportRangeResponse = z.infer<typeof reportRangeSchema>
export type PfBasisResponse = z.infer<typeof pfBasisSchema>
export type EsicHeaderResponse = z.infer<typeof esicHeaderSchema>
export type PtHeaderResponse = z.infer<typeof ptHeaderSchema>
export type PaymentMetricsResponse = z.infer<typeof paymentMetricsSchema>
