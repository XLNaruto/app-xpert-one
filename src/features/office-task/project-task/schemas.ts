import { z } from 'zod'
import {
  auditResponseSchema,
  FREQUENCY_MAX,
  FREQUENCY_MIN,
  prioritySchema,
  progressNoteResponseSchema,
  proofResponseSchema,
  taskStatusSchema,
  updateFrequencySchema,
  verdictResponseSchema,
  verdictSchema,
  workSessionResponseSchema,
  type UpdateFrequency,
} from '@/features/office-task/common'

/** What the API accepts as an other's mobile: 10 digits, starting 6–9. */
export const OTHER_MOBILE_PATTERN = /^[6-9]\d{9}$/

/**
 * A project task targets people by designation, by role — or names one "other":
 * someone who is neither an employee nor a panel user (a contractor, a vendor's
 * technician), who works it from the employee app with their phone OTP.
 */
export const projectPickBySchema = z.enum(['designation', 'role', 'other'])

/** Who may update an "other"'s task on their behalf — one employee OR one panel user. */
const delegateResponseSchema = z.object({
  employee_id: z.number().nullish(),
  user_id: z.number().nullish(),
  name: z.string(),
})

/** The "other" fields an assignee / work row carries — all null for an employee or user. */
const otherAssigneeResponseSchema = z.object({
  task_other_id: z.number().nullish(),
  mobile_number: z.string().nullish(),
  delegate: delegateResponseSchema.nullish(),
})

// ── Responses ──────────────────────────────────────────────────────────────

/** GET /project-tasks row — and GET /project-tasks/:id, which is the same shape. */
export const projectTaskResponseSchema = auditResponseSchema.extend({
  id: z.number(),
  task: z.string(),
  description: z.string().nullish(),
  priority: prioritySchema,
  pick_by: projectPickBySchema,
  designation_id: z.number().nullable(),
  role_id: z.number().nullable(),
  applies_to: z.string().nullish(),
  designation_name: z.string().nullish(),
  role_name: z.string().nullish(),
  assignees: z.array(
    // Exactly one id is set — an employee (designation task), a panel user (role
    // task) or an "other" (`task_other_id`, with their mobile and delegate).
    otherAssigneeResponseSchema.extend({
      employee_id: z.number().nullable(),
      user_id: z.number().nullish(),
      name: z.string(),
      has_started: z.boolean(),
    }),
  ),
  updates_per_day: z.number(),
  /** How `updates_per_day` is counted — absent before the migration, i.e. daily. */
  update_frequency: updateFrequencySchema.nullish(),
  start_date: z.string(),
  deadline: z.string(),
  photo_required: z.boolean(),
  needs_verification: z.boolean(),
  /** ROLLED UP: a share in `pending_approval` counts as `in_progress`. */
  status: taskStatusSchema,
  progress: z.number(),
  has_started_work: z.boolean(),
  is_completed: z.boolean(),
  can_delete: z.boolean(),
  locked_fields: z.array(z.string()),
})

export const projectTaskListResponseSchema = z.object({
  items: z.array(projectTaskResponseSchema),
  total: z.number(),
})

/** GET /project-tasks/:id/works row — one assignee's share. */
export const projectWorkRowResponseSchema = otherAssigneeResponseSchema.extend({
  id: z.number(),
  employee_id: z.number().nullable(),
  user_id: z.number().nullish(),
  /** The person's name, whatever kind; `employee_code` is null for a user or an other. */
  employee_name: z.string(),
  employee_code: z.string().nullish(),
  status: taskStatusSchema,
  latest_percent: z.number(),
  updates_today: z.number(),
  /** Notes in the task's current period (day / Mon–Sun week / month) — compared with `updates_per_day`. */
  updates_this_period: z.number().nullish(),
  started_at: z.string().nullable(),
  submitted_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  /** All sessions, the running one counted up to now. */
  worked_seconds: z.number(),
  running_since: z.string().nullable(),
  verdict: verdictSchema.nullable(),
})

export const projectWorksResponseSchema = z.object({
  items: z.array(projectWorkRowResponseSchema),
  total: z.number(),
})

/** GET /project-tasks/:id/works/:workId — section A of the employee page. */
export const projectWorkDetailResponseSchema = projectWorkRowResponseSchema
  .merge(verdictResponseSchema)
  .extend({
    task_id: z.number(),
    task: z.string(),
    deadline: z.string(),
    updates_per_day: z.number().nullish(),
    update_frequency: updateFrequencySchema.nullish(),
    total_updates: z.number(),
    last_update_at: z.string().nullable(),
    note: z.string().nullish(),
    proof: z.array(proofResponseSchema).nullish(),
  })

/** GET …/works/:workId/activity — the raw pieces, both oldest first, UNMERGED. */
export const projectWorkActivityResponseSchema = z.object({
  sessions: z.array(workSessionResponseSchema),
  progress: z.array(progressNoteResponseSchema),
})

export const bulkEditResponseSchema = z.object({ updated: z.number() })

export type ProjectTaskResponse = z.infer<typeof projectTaskResponseSchema>
export type ProjectWorkRowResponse = z.infer<typeof projectWorkRowResponseSchema>
export type ProjectWorkDetailResponse = z.infer<typeof projectWorkDetailResponseSchema>
export type ProjectWorkActivityResponse = z.infer<typeof projectWorkActivityResponseSchema>

// ── Payloads ───────────────────────────────────────────────────────────────

/**
 * POST / PATCH /project-tasks. PATCH takes the same body: a locked field is
 * judged against the STORED value, so the whole drawer can be posted back, and
 * the assignee list is the COMPLETE new list, diffed server-side. It is named
 * after the target — `employee_ids` for `pick_by: designation`, `user_ids` for
 * `pick_by: role` — and never both. Switching `pick_by` must carry the new list.
 *
 * `pick_by: other` sends the `other` block instead, and none of the target or
 * people keys. On PATCH it is the COMPLETE new value: the same mobile keeps the
 * person (name and delegate updated), a new mobile replaces them, and leaving
 * both delegate ids out clears the delegate.
 */
export interface ProjectTaskPayload {
  task: string
  description: string
  priority: 'high' | 'medium' | 'low'
  pick_by: ProjectPickBy
  designation_id?: number
  role_id?: number
  employee_ids?: number[]
  user_ids?: number[]
  other?: OtherAssigneePayload
  updates_per_day: number
  update_frequency: UpdateFrequency
  start_date: string
  deadline: string
  photo_required: boolean
  needs_verification: boolean
}

/** The `other` block — at most ONE of the two delegate ids. */
export interface OtherAssigneePayload {
  full_name: string
  /** 10 digits starting 6–9 — no `+91`, no spaces. */
  mobile_number: string
  delegate_employee_id?: number
  delegate_user_id?: number
}

/** PATCH /project-tasks/bulk — only non-null fields are applied, all-or-nothing. */
export interface BulkEditPayload {
  ids: number[]
  priority: 'high' | 'medium' | 'low' | null
  start_date: string | null
  deadline: string | null
}

// ── Forms ──────────────────────────────────────────────────────────────────

/**
 * A project task: who it's for (picked by designation or role, or one "other"
 * person), the work, its schedule and its rules. What "who" requires follows
 * "Pick by".
 */
export const projectTaskSchema = z
  .object({
    pickBy: projectPickBySchema,
    designationId: z.string(),
    roleId: z.string(),
    /** The PEOPLE's ids — employees or panel users, per `pickBy`. */
    employeeIds: z.array(z.string()),
    /** An "other"'s full name and mobile — only read for `pickBy: other`. */
    otherName: z.string().trim().max(255, 'Keep it under 255 characters'),
    otherMobile: z.string().trim(),
    /** `employee:12` / `user:3` / `''` for nobody — see `delegateValue`. */
    delegate: z.string(),
    task: z.string().trim().min(1, 'Task name is required').max(255, 'Keep it under 255 characters'),
    priority: z.enum(['high', 'medium', 'low']),
    description: z.string().trim().max(1000, 'Keep it under 1000 characters'),
    updatesPerDay: z
      .string()
      .trim()
      .regex(/^\d+$/, 'Whole number only')
      .refine(
        (v) => Number(v) >= FREQUENCY_MIN && Number(v) <= FREQUENCY_MAX,
        `Between ${FREQUENCY_MIN} and ${FREQUENCY_MAX}`,
      ),
    updateFrequency: updateFrequencySchema,
    startDate: z.string().min(1, 'Start date is required'),
    deadline: z.string().min(1, 'Deadline is required'),
    photoRequired: z.boolean(),
    needsVerification: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.pickBy === 'designation' && !v.designationId) {
      ctx.addIssue({ code: 'custom', path: ['designationId'], message: 'Designation is required' })
    }
    if (v.pickBy === 'role' && !v.roleId) {
      ctx.addIssue({ code: 'custom', path: ['roleId'], message: 'Role is required' })
    }
    if (v.pickBy === 'other') {
      if (!v.otherName) {
        ctx.addIssue({ code: 'custom', path: ['otherName'], message: 'Full name is required' })
      }
      if (!v.otherMobile) {
        ctx.addIssue({ code: 'custom', path: ['otherMobile'], message: 'Mobile number is required' })
      } else if (!OTHER_MOBILE_PATTERN.test(v.otherMobile)) {
        ctx.addIssue({
          code: 'custom',
          path: ['otherMobile'],
          message: 'Please enter a valid 10-digit mobile number.',
        })
      }
    } else if (v.employeeIds.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['employeeIds'], message: 'Assign at least one person' })
    }
    if (v.startDate && v.deadline && v.deadline < v.startDate) {
      ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Cannot be before the start date' })
    }
  })

export type ProjectTaskFormValues = z.infer<typeof projectTaskSchema>
export type ProjectPickBy = z.infer<typeof projectPickBySchema>

/** The bulk bar — only the fields the manager touched are applied. */
export const bulkEditSchema = z
  .object({
    priority: z.string(),
    startDate: z.string(),
    deadline: z.string(),
  })
  .refine((v) => !v.startDate || !v.deadline || v.deadline >= v.startDate, {
    path: ['deadline'],
    message: 'Cannot be before the start date',
  })

export type BulkEditValues = z.infer<typeof bulkEditSchema>
