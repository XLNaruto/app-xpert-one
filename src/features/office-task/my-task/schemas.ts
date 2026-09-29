import { z } from 'zod'
import {
  MAX_PROOF_FILES,
  prioritySchema,
  progressNoteResponseSchema,
  proofResponseSchema,
  sopRunResponseSchema,
  taskStatusSchema,
  verdictResponseSchema,
} from '@/features/office-task/common'

// ── Responses ──────────────────────────────────────────────────────────────

/** GET /my-tasks/sop — unpaged; reading it materialises today. */
export const mySopTasksResponseSchema = z.object({ items: z.array(sopRunResponseSchema) })

/** GET /my-tasks/project — unpaged, deadline first. */
export const myProjectTasksResponseSchema = z.object({
  items: z.array(
    verdictResponseSchema.extend({
      id: z.number(),
      task_id: z.number(),
      task: z.string(),
      description: z.string().nullish(),
      priority: prioritySchema,
      start_date: z.string(),
      deadline: z.string(),
      updates_per_day: z.number(),
      updates_today: z.number(),
      photo_required: z.boolean(),
      needs_verification: z.boolean(),
      status: taskStatusSchema,
      latest_percent: z.number(),
      running_since: z.string().nullable(),
      worked_seconds: z.number(),
      started_at: z.string().nullable(),
      submitted_at: z.string().nullable(),
      completed_at: z.string().nullable(),
      note: z.string().nullish(),
      proof: z.array(proofResponseSchema).nullish(),
      progress: z.array(progressNoteResponseSchema).nullish(),
    }),
  ),
})

/** POST …/complete — `{ status }`. */
export const handInResponseSchema = z.object({
  status: z.enum(['completed', 'pending_approval']),
})

export type MyProjectTaskResponse = z.infer<typeof myProjectTasksResponseSchema>['items'][number]

// ── Forms ──────────────────────────────────────────────────────────────────

const proofSchema = z.object({ name: z.string(), url: z.string(), file: z.any().optional() })

/**
 * The Complete / Submit dialog. What it insists on depends on the task: SOP
 * runs always need a note, and proof is required when the task asks for it.
 * More than five files is a shape failure on the API, so it's capped here.
 */
export function handInSchema(rules: { noteRequired: boolean; proofRequired: boolean }) {
  const files = z.array(proofSchema).max(MAX_PROOF_FILES, `At most ${MAX_PROOF_FILES} files`)
  return z.object({
    note: rules.noteRequired
      ? z.string().trim().min(1, 'Say what you did').max(1000, 'Keep it under 1000 characters')
      : z.string().trim().max(1000, 'Keep it under 1000 characters'),
    proof: rules.proofRequired ? files.min(1, 'Proof is required for this task') : files,
  })
}

export type HandInFormValues = z.infer<ReturnType<typeof handInSchema>>

/** Stopping a project share asks for one thing: how far along it is now. */
export const progressSchema = z.object({
  percent: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Whole number only')
    .refine((v) => Number(v) <= 100, 'At most 100'),
})

export type ProgressFormValues = z.infer<typeof progressSchema>
