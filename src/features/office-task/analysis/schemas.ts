import { z } from 'zod'
import { prioritySchema, taskStatusSchema } from '@/features/office-task/common'

// ── Responses — /user/office-task/analysis/* ───────────────────────────────

const employeeFields = {
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  department_name: z.string().nullable(),
}

/** One employee's SOP rollup — a 4.1 row, and the whole of 4.3. */
export const sopEmployeeResponseSchema = z.object({
  ...employeeFields,
  checklists: z.number(),
  assigned: z.number(),
  completed: z.number(),
  pending: z.number(),
  pending_approval: z.number(),
  missed: z.number(),
  late: z.number(),
  approved: z.number(),
  rejected: z.number(),
  worked_seconds: z.number(),
  completion_rate: z.number(),
  on_time_rate: z.number(),
})

/** One employee's project rollup — a 4.2 row, and 4.6's `summary`. */
export const projectEmployeeResponseSchema = z.object({
  ...employeeFields,
  assigned: z.number(),
  completed: z.number(),
  in_progress: z.number(),
  not_started: z.number(),
  pending_approval: z.number(),
  overdue: z.number(),
  finished_late: z.number(),
  avg_progress: z.number(),
  update_compliance: z.number(),
  worked_seconds: z.number(),
  completion_rate: z.number(),
  on_time_rate: z.number(),
})

/** GET /analysis/sop. */
export const sopAnalysisResponseSchema = z.object({
  items: z.array(sopEmployeeResponseSchema),
  total: z.number(),
  summary: z.object({
    employees: z.number(),
    assigned: z.number(),
    completed: z.number(),
    pending: z.number(),
    missed: z.number(),
    late: z.number(),
    worked_seconds: z.number(),
    completion_rate: z.number(),
    on_time_rate: z.number(),
  }),
})

/** GET /analysis/project. */
export const projectAnalysisResponseSchema = z.object({
  items: z.array(projectEmployeeResponseSchema),
  total: z.number(),
  summary: z.object({
    employees: z.number(),
    assigned: z.number(),
    completed: z.number(),
    in_progress: z.number(),
    not_started: z.number(),
    pending_approval: z.number(),
    overdue: z.number(),
    worked_seconds: z.number(),
    completion_rate: z.number(),
    on_time_rate: z.number(),
  }),
})

/** GET /analysis/sop/:employee_id/checklists. `frequency` is always "daily", so it isn't read. */
export const sopChecklistsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().nullable(),
      name: z.string(),
      runs: z.number(),
      completed: z.number(),
      missed: z.number(),
      late: z.number(),
      completion_rate: z.number(),
    }),
  ),
  total: z.number(),
})

/** GET /analysis/sop/:employee_id/runs. */
export const sopRunsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      date: z.string(),
      checklist: z.string(),
      task: z.string(),
      slot: z.number(),
      status: taskStatusSchema,
      submitted_at: z.string().nullable(),
      is_late: z.boolean(),
      worked_seconds: z.number(),
      verdict: z.enum(['approved', 'rejected']).nullable(),
      needs_approval: z.boolean(),
    }),
  ),
  total: z.number(),
  counts: z.object({
    all: z.number(),
    pending: z.number(),
    pending_approval: z.number(),
    completed: z.number(),
    missed: z.number(),
    late: z.number(),
  }),
})

/** GET /analysis/project/:employee_id. */
export const projectEmployeeDetailResponseSchema = z.object({
  summary: projectEmployeeResponseSchema,
  daily: z.array(z.object({ date: z.string(), updates: z.number(), hours: z.number() })),
})

/** GET /analysis/project/:employee_id/tasks. */
export const projectTasksResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      task_id: z.number(),
      task: z.string(),
      priority: prioritySchema,
      status: taskStatusSchema,
      start_date: z.string(),
      deadline: z.string(),
      completed_at: z.string().nullable(),
      latest_percent: z.number(),
      worked_seconds: z.number(),
      updates: z.number(),
      is_overdue: z.boolean(),
      finished_late: z.boolean(),
    }),
  ),
  total: z.number(),
  counts: z.object({
    all: z.number(),
    pending: z.number(),
    in_progress: z.number(),
    pending_approval: z.number(),
    completed: z.number(),
    overdue: z.number(),
  }),
})

export type SopEmployeeResponse = z.infer<typeof sopEmployeeResponseSchema>
export type ProjectEmployeeResponse = z.infer<typeof projectEmployeeResponseSchema>
export type SopAnalysisResponse = z.infer<typeof sopAnalysisResponseSchema>
export type ProjectAnalysisResponse = z.infer<typeof projectAnalysisResponseSchema>
export type SopChecklistResponse = z.infer<typeof sopChecklistsResponseSchema>['items'][number]
export type SopRunResponse = z.infer<typeof sopRunsResponseSchema>['items'][number]
export type ProjectDayResponse = z.infer<typeof projectEmployeeDetailResponseSchema>['daily'][number]
export type ProjectTaskResponse = z.infer<typeof projectTasksResponseSchema>['items'][number]
