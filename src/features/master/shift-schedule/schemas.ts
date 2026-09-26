import { z } from 'zod'

/** One scheduled date as the API returns it. */
export const scheduleDayResponseSchema = z.object({
  id: z.number(),
  work_date: z.string(),
  is_week_off: z.boolean().nullish(),
  shift_id: z.number().nullish(),
  shift_name: z.string().nullish(),
  source_type: z.string(),
})

export type ScheduleDayResponse = z.infer<typeof scheduleDayResponseSchema>

/** One employee's schedule — an element of the grid, or `GET …/employees/:id`. */
export const scheduleEmployeeResponseSchema = z.object({
  employee_id: z.number(),
  employee_service_id: z.number(),
  employee_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  branch_id: z.number().nullish(),
  department_id: z.number().nullish(),
  days: z.array(scheduleDayResponseSchema),
})

export type ScheduleEmployeeResponse = z.infer<typeof scheduleEmployeeResponseSchema>

/** `GET /user/shift-schedules` — paged by employee. */
export const scheduleGridResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  total: z.number(),
  items: z.array(scheduleEmployeeResponseSchema),
})

export type ScheduleGridResponse = z.infer<typeof scheduleGridResponseSchema>

/** `POST /user/shift-schedules/generate`. */
export const scheduleGenerateResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  employees: z.number(),
  written: z.number(),
  kept_manual: z.number(),
  skipped_no_shift: z.array(z.number()).nullish(),
  skipped_flexible: z.array(z.number()).nullish(),
})

export type ScheduleGenerateResponse = z.infer<typeof scheduleGenerateResponseSchema>

/** The Generate body. */
export interface ScheduleGeneratePayload {
  company_id: number
  branch_id?: number
  department_id?: number
  employee_ids?: number[]
  from: string
  to: string
}

/** The PUT body for one date — `shift_id` omitted keeps the date's shift. */
export interface ScheduleDayPayload {
  is_week_off: boolean
  shift_id?: number | null
}
