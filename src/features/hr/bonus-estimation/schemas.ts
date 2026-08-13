import { z } from 'zod'
import { CALCULATION_FIELDS, type CalculationField } from './constants'

/**
 * `GET /user/bonus-estimation/estimate`, `GET .../saved` and the POST that
 * commits — what the wire carries.
 *
 * There is no form schema here: the screen's inputs are two numbers per row in a
 * table, not a form, and what validates them is the API's own bounds (a
 * percentage of 0–100, an amount up to ten crore) checked as they are keyed.
 */

/** What picks one estimate out. The company comes from the session. */
export interface BonusEstimateFilters {
  companyId: number
  /** Inclusive `yyyy-MM`. `from` after `to` is a 400, not an empty table. */
  from: string
  to: string
  /** `null` is every department, which the API gets as no filter at all. */
  departmentId: number | null
  designationId: number | null
}

/** The saved read takes the same filters — the base is a property of what was saved. */
export type SavedBonusFilters = BonusEstimateFilters

/* ── Responses ─────────────────────────────────────────────────────────────── */

/** The range as the API resolved it, on every one of the three answers. */
const rangeSchema = z.object({
  from: z.string(),
  to: z.string(),
  from_month: z.number(),
  from_year: z.number(),
  to_month: z.number(),
  to_year: z.number(),
})

const calculationFieldSchema = z.enum(CALCULATION_FIELDS)

/**
 * One estimate line. All four bases come back on every one of them, which is
 * what lets the CALCULATION BASE dropdown re-fill the column without a read.
 */
const estimateRowSchema = z.object({
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
  months_processed: z.number(),
  total_net_pay: z.number(),
  total_gross_pay: z.number(),
  total_basic_pay: z.number(),
  total_basic_pay_of_present_days: z.number(),
  advance_bonus: z.number(),
})

/** `total` counts EMPLOYEES, not processed months. */
export const bonusEstimateResponseSchema = z.object({
  range: rangeSchema,
  items: z.array(estimateRowSchema),
  total: z.number(),
})

/** One committed month. `base_amount` is the snapshot taken when it was saved. */
const savedMonthSchema = z.object({
  bonus_id: z.number(),
  salary_id: z.number(),
  month: z.number(),
  year: z.number(),
  designation_id: z.number().nullable(),
  designation_name: z.string().nullable(),
  calculation_field: calculationFieldSchema,
  base_amount: z.number().nullable(),
  percentage: z.number().nullable(),
  amount: z.number(),
  wages_per_day: z.number().nullable(),
  present_days: z.number().nullable(),
  advance_bonus: z.number(),
})

/**
 * The committed bonuses, paged over EMPLOYEES. `months` always comes back whole
 * — a card expands to at most the length of the range — and `total_bonus` is the
 * sum of them, so the header and the rows under it can't disagree.
 */
export const savedBonusResponseSchema = z.object({
  range: rangeSchema,
  items: z.array(
    z.object({
      employee_id: z.number(),
      employee_name: z.string().nullable(),
      employee_code: z.string().nullable(),
      department_name: z.string().nullable(),
      designation_name: z.string().nullable(),
      total_bonus: z.number(),
      advance_bonus: z.number(),
      months: z.array(savedMonthSchema),
    }),
  ),
  total: z.number(),
})

/**
 * What the save answered. `employees[]` is the half that matters: an employee
 * with no processed months, or one whose months were already bonused, is
 * reported individually while the rest of the request lands.
 */
export const saveBonusResponseSchema = z.object({
  range: rangeSchema,
  calculation_field: calculationFieldSchema,
  saved: z.number(),
  skipped_months: z.number(),
  employees: z.array(
    z.object({
      employee_id: z.number(),
      requested_amount: z.number(),
      saved_amount: z.number(),
      months: z.number(),
      skipped_months: z.number(),
      reason: z.string().nullable(),
    }),
  ),
})

export type BonusEstimateResponse = z.infer<typeof bonusEstimateResponseSchema>
export type SavedBonusResponse = z.infer<typeof savedBonusResponseSchema>
export type SaveBonusResponse = z.infer<typeof saveBonusResponseSchema>

/* ── The save ──────────────────────────────────────────────────────────────── */

/**
 * What the api layer sends. One line per employee carrying the total for the
 * WHOLE range — the server splits it across their processed months in proportion
 * to each month's `calculationField`.
 */
export interface SaveBonusPayload {
  companyId: number
  from: string
  to: string
  departmentId: number | null
  designationId: number | null
  /** Which base the amounts were figured on — stored against every month written. */
  calculationField: CalculationField
  employees: {
    employeeId: number
    amount: number
    /** Omitted when the amount was keyed by hand against no usable base. */
    percentage?: number
  }[]
}
