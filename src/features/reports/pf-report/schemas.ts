import { z } from 'zod'
import { pfBasisSchema, reportPeriodSchema } from '@/features/reports/common'

/**
 * The four PF endpoints, as they answer.
 *
 * All of them carry `basis` beside their rows — the rate row the month was
 * priced against. It isn't decoration: the same employee's contribution differs
 * with the ceiling and the rate in force, so a challan printed without saying
 * which ones applied can't be reconciled against the portal's computation.
 */

const pfChallanItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  pf_number: z.string().nullable(),
  uan_number: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
  /** The form's own column — a count of contributing (present) DAYS, not money. */
  wages: z.number().nullable(),
  /** The money base: prorated basic plus every PF-applicable head. */
  epf_wages: z.number().nullable(),
  /** The employee's own contribution, as deducted. */
  ee: z.number().nullable(),
  /** Working days less present days, floored at 0. */
  ncp_days: z.number().nullable(),
  dol: z.string().nullable(),
  /** Always 0 — no source for a reason-for-leaving code. */
  rfl: z.number().nullable(),
  /** Always 0 — no source for an arrears wage. */
  wag: z.number().nullable(),
  /** Always 0 — no source for a transferred-in balance. */
  ee_transfer: z.number().nullable(),
  /** What is left of the employer's contribution after the pension slice. */
  er: z.number().nullable(),
  /** The pension slice of the employer's contribution. */
  eps: z.number().nullable(),
})

const pfStatementItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  pf_number: z.string().nullable(),
  uan_number: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
  /**
   * NULL for a FIXED contribution — the snapshot holds rupees in that mode, and
   * printing it in a `%` column would read as a 1,800% rate. Kept null all the
   * way to the cell, which prints a dash rather than 0%.
   */
  pf_rate_percent: z.number().nullable(),
  /** The AGREED basic capped at the ceiling — not the challan's `epf_wages`. */
  wages: z.number().nullable(),
  total: z.number().nullable(),
  /** The employer's PF share, at the rate in `basis`. */
  pf_amount: z.number().nullable(),
  /** Its pension share — 0 past the pension age limit, when it all goes to PF. */
  pension_amount: z.number().nullable(),
})

const pfNewJoiningItemSchema = z.object({
  employee_id: z.number(),
  /** The POSTING — a re-join is a second line, with its own id. */
  employee_service_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  gender: z.string().nullable(),
  relative_name: z.string().nullable(),
  relative_type: z.string().nullable(),
  birth_date: z.string().nullable(),
  joining_date: z.string().nullable(),
  primary_mobile: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  /** Free text off the current address — there is no city master. */
  city_name: z.string().nullable(),
  state_name: z.string().nullable(),
  marital_status: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
})

const pfEcrItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  /** The key the portal files on — a member without one isn't on this report. */
  uan_number: z.string().nullable(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
  gross_wages: z.number().nullable(),
  /** Capped at the statutory ceiling UNCONDITIONALLY — the portal applies it. */
  epf_wages: z.number().nullable(),
  /** 0 past the pension age limit. */
  eps_wages: z.number().nullable(),
  /** At EDLI's own ceiling, which the act allows to sit below the PF one. */
  edli_wages: z.number().nullable(),
  epf_contribution: z.number().nullable(),
  eps_contribution: z.number().nullable(),
  /** The part of the contribution that stays in EPF. */
  epf_eps_diff: z.number().nullable(),
  ncp_days: z.number().nullable(),
  /** Always 0 — an advance refund is an EPFO-side adjustment with no source here. */
  refund: z.number().nullable(),
})

/** `{ period, basis, items, total }` — the envelope all four share. */
function pfResponseSchema<TItem extends z.ZodTypeAny>(item: TItem) {
  return z.object({
    period: reportPeriodSchema,
    basis: pfBasisSchema,
    items: z.array(item),
    total: z.number(),
  })
}

export const pfChallanResponseSchema = pfResponseSchema(pfChallanItemSchema)
export const pfStatementResponseSchema = pfResponseSchema(pfStatementItemSchema)
export const pfNewJoiningResponseSchema = pfResponseSchema(pfNewJoiningItemSchema)
export const pfEcrResponseSchema = pfResponseSchema(pfEcrItemSchema)

export type PfChallanItemResponse = z.infer<typeof pfChallanItemSchema>
export type PfStatementItemResponse = z.infer<typeof pfStatementItemSchema>
export type PfNewJoiningItemResponse = z.infer<typeof pfNewJoiningItemSchema>
export type PfEcrItemResponse = z.infer<typeof pfEcrItemSchema>
