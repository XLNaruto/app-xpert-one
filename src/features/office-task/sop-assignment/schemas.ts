import { z } from 'zod'
import {
  assignmentStatusSchema,
  auditResponseSchema,
  sopItemResponseSchema,
  sopRunResponseSchema,
  taskStatusSchema,
} from '@/features/office-task/common'

/** GET /sop-assignments row. */
export const sopAssignmentRowResponseSchema = auditResponseSchema.extend({
  id: z.number(),
  /** Exactly one is set: an employee (designation group) or a panel user (role group). */
  employee_id: z.number().nullable(),
  user_id: z.number().nullish(),
  /** The person's name from EITHER master; code and department are null for a user. */
  employee_name: z.string(),
  employee_code: z.string().nullish(),
  department_name: z.string().nullish(),
  /** NULL once the group itself is deleted — `template_name` is a snapshot. */
  group_id: z.number().nullable(),
  template_name: z.string(),
  effective_from: z.string(),
  effective_to: z.string().nullable(),
  status: assignmentStatusSchema,
  items_count: z.number(),
  custom_count: z.number(),
  tasks_per_day: z.number(),
  has_started_work: z.boolean(),
  can_delete: z.boolean(),
})

export const sopAssignmentListResponseSchema = z.object({
  items: z.array(sopAssignmentRowResponseSchema),
  total: z.number(),
})

/** GET /sop-assignments/:id — the header card. */
export const sopAssignmentDetailResponseSchema = sopAssignmentRowResponseSchema.extend({
  designation_name: z.string().nullish(),
})

/** GET /sop-assignments/:id/items — unpaged; materialises today. */
export const sopAssignmentItemsResponseSchema = z.object({
  items: z.array(
    sopItemResponseSchema.extend({
      custom: z.boolean(),
      today: z
        .object({
          status: taskStatusSchema,
          paused: z.boolean(),
          done: z.number(),
          total: z.number(),
        })
        .nullable(),
      worked_seconds: z.number(),
      has_started_work: z.boolean().nullish(),
    }),
  ),
})

/** GET /sop-assignments/:id/runs — fixed order, `from`/`to` required. */
export const sopAssignmentRunsResponseSchema = z.object({
  items: z.array(sopRunResponseSchema),
  total: z.number(),
})

/** POST /sop-assignments/:id/start — the id may be a NEW assignment. */
export const startAssignmentResponseSchema = z.object({ id: z.number() })

export type SopAssignmentRowResponse = z.infer<typeof sopAssignmentRowResponseSchema>
export type SopAssignmentDetailResponse = z.infer<typeof sopAssignmentDetailResponseSchema>
export type SopAssignmentItemResponse = z.infer<
  typeof sopAssignmentItemsResponseSchema
>['items'][number]
