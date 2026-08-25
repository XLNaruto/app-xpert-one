import { z } from 'zod'
import { earliestLeaveDate } from './lib/leave-dates'

/** `HH:MM`, 24-hour — the shape the half-day time fields hold. */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * A leave record.
 *
 * **There is no `payType` field.** The employee (or the desk) picks a leave TYPE;
 * the server spends that type's paid allowance and decides which days are paid.
 * A `pay_type` sent from here would be ignored, so it isn't collected, isn't
 * shown as an input, and isn't in these values at all.
 *
 * `employeeId` travels only on create: `PATCH …/:id` can't move a leave to a
 * different employee.
 */
function baseLeaveShape() {
  return z.object({
    employeeId: z.string().trim().min(1, 'Please select an employee'),
    leaveTypeId: z.string().trim().min(1, 'Please select a leave type'),
    fromDate: z.string().trim().min(1, 'Please select the from date'),
    toDate: z.string().trim().min(1, 'Please select the to date'),
    duration: z.string().trim().min(1, 'Please select the duration'),
    fromTime: z.string(),
    toTime: z.string(),
    status: z.string(),
    leaveReason: z.string().trim().max(2000, 'Cannot exceed 2000 characters'),
    /** The storage KEY from the presign, never the file itself. */
    attachment: z.string().trim().max(500, 'Cannot exceed 500 characters'),
  })
}

export type LeaveFormValues = z.infer<ReturnType<typeof baseLeaveShape>>

/**
 * The schema for the mode the form is in.
 *
 * The two modes differ in ONE rule, and it matters: a NEW leave must start
 * **tomorrow or later** in IST — a leave is filed ahead of the day it's taken and
 * the API answers today or earlier with a 400. An existing record is not re-held
 * to that floor: it was filed when its dates were still in the future, and
 * re-validating it would make an untouched row unsavable the moment its start
 * date arrives.
 *
 * Build it through `useMemo` — a fresh schema object every render would reset the
 * resolver on each keystroke.
 */
export function leaveSchemaFor({ isEdit }: { isEdit: boolean }) {
  const earliest = earliestLeaveDate()

  return baseLeaveShape().superRefine((values, ctx) => {
    if (!isEdit && values.fromDate && values.fromDate < earliest) {
      ctx.addIssue({
        code: 'custom',
        path: ['fromDate'],
        message: 'A leave has to start tomorrow or later',
      })
    }

    if (values.fromDate && values.toDate && values.toDate < values.fromDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: '"To" date cannot be before the "from" date',
      })
    }

    // A half day is a slice of ONE day, so it carries the two times a full day
    // mustn't — and both of its ends fall on the same date.
    if (values.duration !== 'HALF_DAY') return

    if (!TIME_RE.test(values.fromTime)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fromTime'],
        message: 'Enter a start time as HH:MM',
      })
    }
    if (!TIME_RE.test(values.toTime)) {
      ctx.addIssue({
        code: 'custom',
        path: ['toTime'],
        message: 'Enter an end time as HH:MM',
      })
    } else if (values.fromTime && values.toTime <= values.fromTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['toTime'],
        message: 'End time must be after the start time',
      })
    }
    if (values.fromDate !== values.toDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: 'A half day covers a single date',
      })
    }
  })
}

/**
 * The Approve / Reject decision on a pending leave.
 *
 * The remark is REQUIRED on a rejection and optional on an approval: a rejection
 * with no reason leaves the employee nothing to act on, and the API answers a
 * blank one with a 400.
 */
export const leaveDecisionSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    remark: z.string().trim().max(2000, 'Cannot exceed 2000 characters'),
  })
  .refine((v) => v.status !== 'REJECTED' || v.remark.trim() !== '', {
    path: ['remark'],
    message: 'Say why the leave is being rejected',
  })

export type LeaveDecisionFormValues = z.infer<typeof leaveDecisionSchema>

/* ── Wire shapes ─────────────────────────────────────────────────────────── */

/**
 * One stored row. `pay_type` is READ here and never written: the server sets it
 * from what was left of the type's allowance when the leave was filed.
 */
export const leaveResponseSchema = z.object({
  id: z.number(),
  /**
   * The application the row belongs to. Both halves of a split share it. Older
   * rows may answer without one, so the mapper falls back to the row's own id.
   */
  application_ref: z.string().nullish(),
  employee_id: z.number(),
  employee_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  // A row nested in an application response repeats only what changed, so
  // everything below the identity is optional.
  company_id: z.number().nullish(),
  from_date: z.string().nullish(),
  to_date: z.string().nullish(),
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
  /**
   * The approval block. Present on the list rows and on the detail read; all
   * three are null/false once the leave has been decided.
   */
  pending_with_role: z.string().nullish(),
  pending_with_owner: z.boolean().nullish(),
  can_decide: z.boolean().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type LeaveResponse = z.infer<typeof leaveResponseSchema>

/**
 * What a write answers — the APPLICATION, not a row.
 *
 * `split: true` means the allowance ran out inside the range and the request
 * became two rows: a paid one and an unpaid one. They are approved, rejected and
 * deleted together.
 */
export const leaveApplicationResponseSchema = z.object({
  application_ref: z.string().nullish(),
  from_date: z.string().nullish(),
  to_date: z.string().nullish(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  paid_days: z.number().nullish(),
  unpaid_days: z.number().nullish(),
  split: z.boolean().nullish(),
  rows: z.array(leaveResponseSchema).default([]),
})

export type LeaveApplicationResponse = z.infer<typeof leaveApplicationResponseSchema>

export const leaveListResponseSchema = z.object({
  items: z.array(leaveResponseSchema),
  total: z.number(),
})

/** One leave type's line on the balance card. */
const leaveBalanceItemSchema = z.object({
  leave_type_id: z.number(),
  short_code: z.string().nullish(),
  leave_type: z.string().nullish(),
  pay_type: z.enum(['PAID', 'UNPAID']).nullish(),
  total: z.number().nullish(),
  quota_source: z.enum(['EMPLOYEE', 'DESIGNATION', 'NONE']).nullish(),
  used: z.number().nullish(),
  pending: z.number().nullish(),
  /** `null` on an UNPAID type — uncapped, so "Unlimited" rather than `0`. */
  available: z.number().nullish(),
  overflow: z.number().nullish(),
})

export const leaveBalanceResponseSchema = z.object({
  year: z.number(),
  from_date: z.string().nullish(),
  to_date: z.string().nullish(),
  paid: z
    .object({
      total: z.number().nullish(),
      used: z.number().nullish(),
      pending: z.number().nullish(),
      available: z.number().nullish(),
      overflow: z.number().nullish(),
    })
    .nullish(),
  unpaid: z
    .object({
      used: z.number().nullish(),
      pending: z.number().nullish(),
      effective: z.number().nullish(),
    })
    .nullish(),
  items: z.array(leaveBalanceItemSchema).default([]),
})

export type LeaveBalanceResponse = z.infer<typeof leaveBalanceResponseSchema>

/**
 * A leave body. **No `pay_type`** — the server decides it from the type's
 * remaining allowance, and one sent from here is ignored.
 *
 * Which keys are present depends on the mode, so every one below is optional:
 * see `leaveToPayload`.
 */
export interface LeavePayload {
  /** Create only — a leave can't be moved to a different employee. */
  employee_id?: number | null
  /** Create only — a decision goes through `PATCH …/:id/status`. */
  status?: string
  from_date?: string | null
  to_date?: string | null
  duration?: string
  from_time?: string
  to_time?: string
  leave_reason?: string | null
  leave_type_id?: number | null
  /** The storage key from the presign, never the file. */
  attachment?: string | null
}

export interface LeaveDecisionPayload {
  status: 'APPROVED' | 'REJECTED'
  remark: string | null
}
