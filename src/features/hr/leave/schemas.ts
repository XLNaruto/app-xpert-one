import { z } from 'zod'

/** `HH:MM`, 24-hour — the shape the half-day time fields hold. */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * A leave record. `payType` is derived from the chosen leave type's own pay type
 * and shown read-only, so the two can never disagree.
 *
 * `employeeId` is part of the form here — unlike the old employee-wizard step,
 * this screen is reached without an employee in hand, so the record has to name
 * one. It travels only on create: `PATCH …/:id` can't move a leave to a different
 * employee.
 */
export const leaveSchema = z
  .object({
    employeeId: z.string().trim().min(1, 'Please select an employee'),
    leaveTypeId: z.string().trim().min(1, 'Please select a leave type'),
    fromDate: z.string().trim().min(1, 'Please select the from date'),
    toDate: z.string().trim().min(1, 'Please select the to date'),
    duration: z.string().trim().min(1, 'Please select the duration'),
    fromTime: z.string(),
    toTime: z.string(),
    payType: z.string(),
    status: z.string(),
    leaveReason: z.string().trim().max(2000, 'Cannot exceed 2000 characters'),
  })
  .refine((v) => !v.fromDate || !v.toDate || v.toDate >= v.fromDate, {
    path: ['toDate'],
    message: '"To" date cannot be before the "from" date',
  })
  // A half day is a slice of one day, so it carries the two times a full day mustn't.
  .refine((v) => v.duration !== 'HALF_DAY' || TIME_RE.test(v.fromTime), {
    path: ['fromTime'],
    message: 'Enter a start time as HH:MM',
  })
  .refine((v) => v.duration !== 'HALF_DAY' || TIME_RE.test(v.toTime), {
    path: ['toTime'],
    message: 'Enter an end time as HH:MM',
  })
  .refine(
    (v) => v.duration !== 'HALF_DAY' || !v.fromTime || !v.toTime || v.toTime > v.fromTime,
    { path: ['toTime'], message: 'End time must be after the start time' },
  )
  .refine((v) => v.duration !== 'HALF_DAY' || v.fromDate === v.toDate, {
    path: ['toDate'],
    message: 'A half day covers a single date',
  })

export type LeaveFormValues = z.infer<typeof leaveSchema>

/** The Approve / Reject decision on a pending leave. */
export const leaveDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  remark: z.string().trim().max(2000, 'Cannot exceed 2000 characters'),
})

export type LeaveDecisionFormValues = z.infer<typeof leaveDecisionSchema>

export const leaveResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  employee_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  company_id: z.number(),
  from_date: z.string().nullish(),
  to_date: z.string().nullish(),
  // Both come back nullable on a record saved without them.
  duration: z.enum(['FULL_DAY', 'HALF_DAY']).nullish(),
  from_time: z.string().nullish(),
  to_time: z.string().nullish(),
  pay_type: z.enum(['PAID', 'UNPAID']).nullish(),
  leave_type_id: z.number().nullish(),
  leave_type: z.string().nullish(),
  leave_type_name: z.string().nullish(),
  leave_reason: z.string().nullish(),
  attachment: z.string().nullish(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  status_remark: z.string().nullish(),
  status_at: z.string().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type LeaveResponse = z.infer<typeof leaveResponseSchema>

export const leaveListResponseSchema = z.object({
  items: z.array(leaveResponseSchema),
  total: z.number(),
})

export interface LeavePayload {
  /** Create only — a leave can't be moved to a different employee. */
  employee_id?: number | null
  status?: string
  from_date: string | null
  to_date: string | null
  duration: string
  from_time?: string
  to_time?: string
  leave_reason: string | null
  pay_type: string
  leave_type_id: number | null
}

export interface LeaveDecisionPayload {
  status: 'APPROVED' | 'REJECTED'
  remark: string | null
}
