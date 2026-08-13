import { z } from 'zod'
import { esicHeaderSchema, reportPeriodSchema } from '@/features/reports/common'

/**
 * The two ESIC endpoints. Both carry `header` — the establishment and the rates
 * in force — beside their rows.
 */

const esicStatementItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  insurance_no: z.string().nullable(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
  no_of_days: z.number().nullable(),
  /**
   * The wage THE ACT WAS APPLIED TO — prorated basic plus every ESIC-applicable
   * head — not the gross, which is why it normally sits below `gross_pay`.
   */
  wages: z.number().nullable(),
  esi_employee: z.number().nullable(),
  esi_employer: z.number().nullable(),
  total_esi: z.number().nullable(),
})

const esicChallanItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  ip_no: z.string().nullable(),
  ip_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
  no_of_days: z.number().nullable(),
  /** The statement's `wages` under the challan's own name. */
  total_monthly_wages: z.number().nullable(),
  /**
   * ALWAYS NULL. Why a month paid nothing — maternity, a strike, unpaid
   * absence — is recorded nowhere in this system and is filled in on the portal.
   * Null says exactly that, where an empty string would read as a reason checked
   * and found blank.
   */
  reason_for_zero_wages: z.string().nullable(),
  /** The posting's leaving date — null for anyone still in service. */
  last_working_day: z.string().nullable(),
})

export const esicStatementResponseSchema = z.object({
  period: reportPeriodSchema,
  header: esicHeaderSchema,
  items: z.array(esicStatementItemSchema),
  total: z.number(),
})

export const esicChallanResponseSchema = z.object({
  period: reportPeriodSchema,
  header: esicHeaderSchema,
  items: z.array(esicChallanItemSchema),
  total: z.number(),
})

export type EsicStatementItemResponse = z.infer<typeof esicStatementItemSchema>
export type EsicChallanItemResponse = z.infer<typeof esicChallanItemSchema>
