import { z } from 'zod'
import {
  prioritySchema,
  proofResponseSchema,
  sopRunResponseSchema,
  taskStatusSchema,
  verdictResponseSchema,
} from '@/features/office-task/common'

// ── Responses ──────────────────────────────────────────────────────────────

const countsSchema = z.object({
  awaiting: z.number(),
  approved: z.number(),
  rejected: z.number(),
  all: z.number(),
})

/** GET /approvals/sop — the SOP RUN shape plus who worked it. */
export const sopApprovalsResponseSchema = z.object({
  items: z.array(
    sopRunResponseSchema.extend({
      employee_name: z.string(),
      employee_code: z.string().nullish(),
      department_name: z.string().nullish(),
    }),
  ),
  total: z.number(),
  counts: countsSchema,
})

/** GET /approvals/project. */
export const projectApprovalsResponseSchema = z.object({
  items: z.array(
    verdictResponseSchema.extend({
      id: z.number(),
      task_id: z.number(),
      task: z.string(),
      description: z.string().nullish(),
      priority: prioritySchema,
      deadline: z.string(),
      photo_required: z.boolean(),
      employee_id: z.number().nullable(),
      user_id: z.number().nullish(),
      employee_name: z.string(),
      employee_code: z.string().nullish(),
      department_name: z.string().nullish(),
      status: taskStatusSchema,
      latest_percent: z.number().nullish(),
      submitted_at: z.string().nullable(),
      completed_at: z.string().nullable(),
      worked_seconds: z.number().nullish(),
      note: z.string().nullish(),
      proof: z.array(proofResponseSchema).nullish(),
      is_late: z.boolean(),
    }),
  ),
  total: z.number(),
  counts: countsSchema,
})

/** POST …/decide — `{ ids, verdict, remarks }` → how many were answered. */
export const decideResponseSchema = z.object({ updated: z.number() })

export type SopApprovalResponse = z.infer<typeof sopApprovalsResponseSchema>['items'][number]
export type ProjectApprovalResponse = z.infer<typeof projectApprovalsResponseSchema>['items'][number]

// ── Form ───────────────────────────────────────────────────────────────────

/**
 * The approver's remarks, kept short. Optional on an approval; REQUIRED on a
 * rejection — the employee has to redo the work, and the reason is all they
 * get to go on.
 */
export function verdictSchema(verdict: 'approved' | 'rejected') {
  const remarks = z.string().trim().max(500, 'Keep it under 500 characters')
  return z.object({
    remarks:
      verdict === 'rejected' ? remarks.min(1, 'Say what needs redoing') : remarks,
  })
}

export type VerdictFormValues = z.infer<ReturnType<typeof verdictSchema>>
