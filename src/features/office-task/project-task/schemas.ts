import { z } from 'zod'
import {
  auditResponseSchema,
  FREQUENCY_MAX,
  FREQUENCY_MIN,
  pickBySchema,
  prioritySchema,
  progressNoteResponseSchema,
  proofResponseSchema,
  taskStatusSchema,
  verdictResponseSchema,
  verdictSchema,
  workSessionResponseSchema,
} from '@/features/office-task/common'

// ── Responses ──────────────────────────────────────────────────────────────

/** GET /project-tasks row — and GET /project-tasks/:id, which is the same shape. */
export const projectTaskResponseSchema = auditResponseSchema.extend({
  id: z.number(),
  task: z.string(),
  description: z.string().nullish(),
  priority: prioritySchema,
  pick_by: pickBySchema,
  designation_id: z.number().nullable(),
  role_id: z.number().nullable(),
  applies_to: z.string().nullish(),
  designation_name: z.string().nullish(),
  role_name: z.string().nullish(),
  assignees: z.array(
    // Exactly one id is set — an employee (designation task) or a panel user (role task).
    z.object({
      employee_id: z.number().nullable(),
      user_id: z.number().nullish(),
      name: z.string(),
      has_started: z.boolean(),
    }),
  ),
  updates_per_day: z.number(),
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
export const projectWorkRowResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number().nullable(),
  user_id: z.number().nullish(),
  /** The person's name from EITHER master; `employee_code` is null for a user. */
  employee_name: z.string(),
  employee_code: z.string().nullish(),
  status: taskStatusSchema,
  latest_percent: z.number(),
  updates_today: z.number(),
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
 */
export interface ProjectTaskPayload {
  task: string
  description: string
  priority: 'high' | 'medium' | 'low'
  pick_by: 'designation' | 'role'
  designation_id?: number
  role_id?: number
  employee_ids?: number[]
  user_ids?: number[]
  updates_per_day: number
  start_date: string
  deadline: string
  photo_required: boolean
  needs_verification: boolean
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
 * A project task: who it's for (picked by designation or role), the work, its
 * schedule and its rules. The designation/role requirement follows "Pick by".
 */
export const projectTaskSchema = z
  .object({
    pickBy: z.enum(['designation', 'role']),
    designationId: z.string(),
    roleId: z.string(),
    /** The PEOPLE's ids — employees or panel users, per `pickBy`. */
    employeeIds: z.array(z.string()).min(1, 'Assign at least one person'),
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
    if (v.startDate && v.deadline && v.deadline < v.startDate) {
      ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Cannot be before the start date' })
    }
  })

export type ProjectTaskFormValues = z.infer<typeof projectTaskSchema>

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
