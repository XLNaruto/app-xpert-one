import { z } from 'zod'

/**
 * `GET /user/salary/report` — the processed month, with its per-head breakdown.
 *
 * Read-only: there is no form on this screen, so there is no form schema here —
 * only what the endpoint answers and what selects it.
 */

/** What picks one report out. The company comes from the session. */
export interface SalaryViewFilters {
  companyId: number
  month: number
  year: number
  /** `null` is every department, which the API gets as no filter at all. */
  departmentId: number | null
}

/** One stored allowance / deduction line. */
const reportComponentSchema = z.object({
  id: z.number(),
  pay_component_id: z.number(),
  pay_component_name: z.string().nullable(),
  pay_component_short_code: z.string().nullable(),
  pay_component_type: z.string().nullable(),
  amount: z.number(),
  pf_applicable: z.boolean(),
  esic_applicable: z.boolean(),
  pt_applicable: z.boolean(),
})

/**
 * The stored salary itself — the figures as committed, plus the act settings the
 * month was priced on. Nullable almost throughout: a row saved before an act
 * applied to it carries no value for that act rather than a zero.
 */
const reportSalarySchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  employee_service_id: z.number(),
  month: z.number(),
  year: z.number(),
  basic_pay: z.number().nullable(),
  wages_per_day: z.number().nullable(),
  working_days: z.number().nullable(),
  weekly_off: z.string().nullable(),
  working_hour: z.number().nullable(),
  present_days: z.number().nullable(),
  basic_pay_for_present_days: z.number().nullable(),
  is_pf_act_applicable: z.boolean().nullable(),
  pf_deduction_type: z.string().nullable(),
  pf_deduction_amount: z.number().nullable(),
  employee_pf: z.number().nullable(),
  employer_pf: z.number().nullable(),
  is_esic_act_applicable: z.boolean().nullable(),
  esic_deduction_basis: z.string().nullable(),
  employee_esic_deduction_percentage: z.number().nullable(),
  employer_esic_deduction_percentage: z.number().nullable(),
  employee_esic: z.number().nullable(),
  employer_esic: z.number().nullable(),
  is_pt_act_applicable: z.boolean().nullable(),
  pt_act_type: z.string().nullable(),
  employee_pt: z.number().nullable(),
  is_lwf_act_applicable: z.boolean().nullable(),
  employee_lwf: z.number().nullable(),
  is_tds_act_applicable: z.boolean().nullable(),
  tds_percentage: z.number().nullable(),
  employee_tds: z.number().nullable(),
  is_overtime_applicable: z.boolean(),
  overtime_rate_per_hour: z.number().nullable(),
  ot_hours: z.number().nullable(),
  ot_amount: z.number().nullable(),
  extra_days: z.number().nullable(),
  extra_days_amount: z.number().nullable(),
  total_allowance: z.number().nullable(),
  total_deduction: z.number().nullable(),
  gross_pay: z.number().nullable(),
  net_pay: z.number().nullable(),
  is_paid: z.boolean(),
  payment_date: z.string().nullable(),
  is_import_from_sheet: z.boolean(),
})

const reportItemSchema = z.object({
  salary: reportSalarySchema,
  employee_code: z.string().nullable(),
  employee_name: z.string().nullable(),
  primary_mobile_number: z.string().nullable(),
  gender: z.string().nullable(),
  birth_date: z.string().nullable(),
  marital_status: z.string().nullable(),
  email: z.string().nullable(),
  relation: z.string().nullable(),
  relative_name: z.string().nullable(),
  joining_date: z.string().nullable(),
  department_id: z.number().nullable(),
  department_name: z.string().nullable(),
  department_code: z.string().nullable(),
  designation_id: z.number().nullable(),
  designation_name: z.string().nullable(),
  pf_number: z.string().nullable(),
  uan_number: z.string().nullable(),
  esic_number: z.string().nullable(),
  aadhar_number: z.string().nullable(),
  bank_name: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  bank_branch_name: z.string().nullable(),
  ifsc_code: z.string().nullable(),
  allowances: z.array(reportComponentSchema),
  deductions: z.array(reportComponentSchema),
})

/**
 * The report as a whole.
 *
 * `allowance_heads` / `deduction_heads` are the union of head names across the
 * result — the column set the long view pivots on — and `totals` sums the rows
 * returned, so a page's footer adds up to the columns above it.
 */
export const salaryReportResponseSchema = z.object({
  period: z.object({
    month: z.number(),
    year: z.number(),
    from: z.string(),
    to: z.string(),
    cycle_start_day: z.number(),
    total_days_in_month: z.number(),
  }),
  items: z.array(reportItemSchema),
  total: z.number(),
  allowance_heads: z.array(z.string()),
  deduction_heads: z.array(z.string()),
  totals: z.object({
    gross_pay: z.number(),
    net_pay: z.number(),
    total_allowance: z.number(),
    total_deduction: z.number(),
    employee_pf: z.number(),
    employee_esic: z.number(),
    employee_pt: z.number(),
    employee_lwf: z.number(),
    employee_tds: z.number(),
    employer_pf: z.number(),
    employer_esic: z.number(),
  }),
})

export type SalaryReportResponse = z.infer<typeof salaryReportResponseSchema>
export type SalaryReportItemResponse = SalaryReportResponse['items'][number]
export type SalaryReportComponentResponse = z.infer<typeof reportComponentSchema>
