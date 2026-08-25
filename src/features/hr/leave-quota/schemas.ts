import { z } from 'zod'

/** The API's bounds on one cell: a whole number of days in a year. */
export const ANNUAL_PAID_LEAVE_MIN = 0
export const ANNUAL_PAID_LEAVE_MAX = 366

const leaveQuotaRowSchema = z.object({
  leave_type_id: z.number(),
  short_code: z.string().nullish(),
  leave_type: z.string().nullish(),
  pay_type: z.enum(['PAID', 'UNPAID']).nullish(),
  /** `null` = nothing set at this tier. Distinct from a stored `0`. */
  annual_paid_leave: z.number().nullish(),
  unlimited: z.boolean().nullish(),
  /** Employee grid only — the designation's number behind an empty cell. */
  falls_back_to: z.number().nullish(),
  fallback_source: z.enum(['EMPLOYEE', 'DESIGNATION', 'NONE']).nullish(),
})

export const designationLeaveQuotasResponseSchema = z.object({
  designation_id: z.number(),
  designation_name: z.string().nullish(),
  company_id: z.number().nullish(),
  items: z.array(leaveQuotaRowSchema).default([]),
})

export type DesignationLeaveQuotasResponse = z.infer<
  typeof designationLeaveQuotasResponseSchema
>

export const employeeLeaveQuotasResponseSchema = z.object({
  employee_id: z.number(),
  employee_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  company_id: z.number().nullish(),
  designation_id: z.number().nullish(),
  designation_name: z.string().nullish(),
  year: z.number(),
  items: z.array(leaveQuotaRowSchema).default([]),
})

export type EmployeeLeaveQuotasResponse = z.infer<
  typeof employeeLeaveQuotasResponseSchema
>

/**
 * The save body. `rows` is the COMPLETE grid — a `PUT` is a whole-list replace, so
 * a leave type left out has its allowance at this tier cleared and falls through
 * to the tier below.
 */
export interface LeaveQuotasPayload {
  rows: { leave_type_id: number; annual_paid_leave: number }[]
}
