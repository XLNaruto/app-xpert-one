import { z } from 'zod'
import {
  paymentMetricsSchema,
  reportPeriodSchema,
  reportRangeSchema,
  reportResponseSchema,
} from '@/features/reports/common'

/**
 * The five Salary Report endpoints, as they answer.
 *
 * Read-only screens — no form, so no form schema. Almost every field is
 * nullable: a register priced before a field existed on the employee carries no
 * value for it rather than an empty string, and the difference matters on a
 * document that will be filed.
 */

const paySlipItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  designation_name: z.string().nullable(),
  department_name: z.string().nullable(),
  present_days: z.number().nullable(),
  working_days: z.number().nullable(),
  basic_pay: z.number().nullable(),
  gross_pay: z.number().nullable(),
  deductions: z.number().nullable(),
  net_pay: z.number().nullable(),
})

const payRegisterItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  department_name: z.string().nullable(),
  gender: z.string().nullable(),
  birth_date: z.string().nullable(),
  marital_status: z.string().nullable(),
  primary_mobile: z.string().nullable(),
  joining_date: z.string().nullable(),
  aadhar_number: z.string().nullable(),
  uan_number: z.string().nullable(),
  esic_number: z.string().nullable(),
  bank_name: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  ifsc_code: z.string().nullable(),
  bank_branch_name: z.string().nullable(),
  relative_type: z.string().nullable(),
  relative_name: z.string().nullable(),
  email: z.string().nullable(),
  /** The WORK location — the branch the posting sits under, null with no branches. */
  location: z.string().nullable(),
  present_days: z.number().nullable(),
  working_days: z.number().nullable(),
  basic_pay: z.number().nullable(),
  gross_pay: z.number().nullable(),
  pf_amount: z.number().nullable(),
  esic_amount: z.number().nullable(),
  pt_amount: z.number().nullable(),
  total_deduction: z.number().nullable(),
  net_pay: z.number().nullable(),
})

const grossSalaryItemSchema = z.object({
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
  total_gross_pay: z.number().nullable(),
  primary_mobile: z.string().nullable(),
  aadhar_number: z.string().nullable(),
  joining_date: z.string().nullable(),
  /** How many months of the range this line covers. */
  months_processed: z.number().nullable(),
})

const paidSalaryItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  primary_mobile: z.string().nullable(),
  net_pay: z.number().nullable(),
  /** The date of the batch that settled the row. */
  payment_date: z.string().nullable(),
})

const unpaidSalaryItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  primary_mobile: z.string().nullable(),
  gross_pay: z.number().nullable(),
  net_pay: z.number().nullable(),
  /** Always false on this report — it selects on exactly that. */
  is_paid: z.boolean().nullable(),
})

export const paySlipResponseSchema = reportResponseSchema(paySlipItemSchema)
export const payRegisterResponseSchema = reportResponseSchema(payRegisterItemSchema)

/** The only type with a `range` instead of a `period`. */
export const grossSalaryResponseSchema = z.object({
  range: reportRangeSchema,
  items: z.array(grossSalaryItemSchema),
  total: z.number(),
})

/**
 * Both payment reports carry `metrics` — the two header tiles over the WHOLE
 * filter, not the page. A page of twenty rows out of two hundred could never add
 * up to its own header, which is why the tiles are the server's figure.
 */
export const paidSalaryResponseSchema = z.object({
  period: reportPeriodSchema,
  metrics: paymentMetricsSchema,
  items: z.array(paidSalaryItemSchema),
  total: z.number(),
})

export const unpaidSalaryResponseSchema = z.object({
  period: reportPeriodSchema,
  metrics: paymentMetricsSchema,
  items: z.array(unpaidSalaryItemSchema),
  total: z.number(),
})

export type PaySlipItemResponse = z.infer<typeof paySlipItemSchema>
export type PayRegisterItemResponse = z.infer<typeof payRegisterItemSchema>
export type GrossSalaryItemResponse = z.infer<typeof grossSalaryItemSchema>
export type PaidSalaryItemResponse = z.infer<typeof paidSalaryItemSchema>
export type UnpaidSalaryItemResponse = z.infer<typeof unpaidSalaryItemSchema>
