import { z } from 'zod'

/**
 * The response pieces every Office Task endpoint shares. Module schemas extend
 * these rather than restating them, so one shape change lands in one place.
 */

export const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'pending_approval',
  'completed',
  'missed',
])
export const verdictSchema = z.enum(['approved', 'rejected'])
export const prioritySchema = z.enum(['high', 'medium', 'low'])
export const pickBySchema = z.enum(['designation', 'role'])
export const assignmentStatusSchema = z.enum(['active', 'stopped'])

/**
 * The platform-standard audit block. `created_by` / `updated_by` are raw actor
 * ids AS TEXT — the names are the `*_by_name` pair, and those are `null` when
 * the writer wasn't a tenant user (a super-admin, an employee).
 */
export const auditResponseSchema = z.object({
  created_at: z.string(),
  created_by: z.union([z.string(), z.number()]).nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by: z.union([z.string(), z.number()]).nullish(),
  updated_by_name: z.string().nullish(),
})

/** A proof file on read: `{ key, name, content_type }`. */
export const proofResponseSchema = z.object({
  key: z.string(),
  name: z.string(),
  content_type: z.string().nullish(),
})

export const verdictResponseSchema = z.object({
  verdict: verdictSchema.nullable(),
  verdict_remarks: z.string().nullish(),
  verdict_by: z.string().nullish(),
  verdict_at: z.string().nullish(),
})

/** One checklist line — a group item, a held copy, or a custom task. */
export const sopItemResponseSchema = z.object({
  id: z.number(),
  task: z.string(),
  description: z.string().nullish(),
  frequency: z.number(),
  photo_required: z.boolean(),
  needs_approval: z.boolean(),
})

/** The SOP RUN shape — identical in the history, the approval queue and My Tasks. */
export const sopRunResponseSchema = verdictResponseSchema.extend({
  id: z.number(),
  item_id: z.number(),
  assignment_id: z.number(),
  /** Exactly one of the pair is set: an employee (designation pick) or a panel user (role pick). */
  employee_id: z.number().nullable(),
  user_id: z.number().nullish(),
  date: z.string(),
  task: z.string(),
  description: z.string().nullish(),
  template_name: z.string(),
  slot: z.number(),
  slots: z.number(),
  status: taskStatusSchema,
  running_since: z.string().nullable(),
  worked_seconds: z.number(),
  photo_required: z.boolean(),
  needs_approval: z.boolean(),
  submitted_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  note: z.string().nullish(),
  proof: z.array(proofResponseSchema).nullish(),
})

export const progressNoteResponseSchema = z.object({
  id: z.number(),
  at: z.string(),
  percent: z.number(),
  note: z.string().nullish(),
  photos: z.array(proofResponseSchema).nullish(),
})

export const workSessionResponseSchema = z.object({
  start: z.string(),
  end: z.string().nullable(),
})

/**
 * A picker row. A designation search lists EMPLOYEES, a role search lists PANEL
 * USERS — `id` is whichever of `employee_id` / `user_id` is set, and is what gets
 * posted back (under the field `pick_by` names). A user row has no code,
 * department or designation.
 */
export const officeTaskEmployeeResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number().nullish(),
  user_id: z.number().nullish(),
  email: z.string().nullish(),
  name: z.string(),
  code: z.string().nullish(),
  department_id: z.number().nullish(),
  department_name: z.string().nullish(),
  designation_id: z.number().nullish(),
  role_id: z.number().nullish(),
  already_assigned: z.boolean().nullish(),
  assignment_id: z.number().nullish(),
})

export const officeTaskEmployeesResponseSchema = z.object({
  items: z.array(officeTaskEmployeeResponseSchema),
  total: z.number(),
})

/** `{ key, name }` — what a write sends for each proof file. */
export interface ProofPayload {
  key: string
  name: string
}

export type AuditResponse = z.infer<typeof auditResponseSchema>
export type ProofResponse = z.infer<typeof proofResponseSchema>
export type VerdictResponse = z.infer<typeof verdictResponseSchema>
export type SopItemResponse = z.infer<typeof sopItemResponseSchema>
export type SopRunResponse = z.infer<typeof sopRunResponseSchema>
export type ProgressNoteResponse = z.infer<typeof progressNoteResponseSchema>
export type WorkSessionResponse = z.infer<typeof workSessionResponseSchema>
export type OfficeTaskEmployeeResponse = z.infer<typeof officeTaskEmployeeResponseSchema>
