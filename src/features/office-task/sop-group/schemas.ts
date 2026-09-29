import { z } from 'zod'
import {
  auditResponseSchema,
  FREQUENCY_MAX,
  FREQUENCY_MIN,
  pickBySchema,
  sopItemResponseSchema,
} from '@/features/office-task/common'

// ── Responses ──────────────────────────────────────────────────────────────

/** GET /sop-groups row. */
export const sopGroupRowResponseSchema = auditResponseSchema.extend({
  id: z.number(),
  name: z.string(),
  pick_by: pickBySchema,
  designation_id: z.number().nullable(),
  role_id: z.number().nullable(),
  applies_to: z.string().nullish(),
  sort_order: z.number().nullish(),
  items_count: z.number().nullish(),
  tasks_per_day: z.number(),
  any_photo: z.boolean().nullish(),
  any_approval: z.boolean().nullish(),
  active_assignees: z.number(),
  has_started_work: z.boolean(),
  can_delete: z.boolean(),
  target_locked: z.boolean().nullish(),
})

export const sopGroupListResponseSchema = z.object({
  items: z.array(sopGroupRowResponseSchema),
  total: z.number(),
})

/** GET /sop-groups/:id — also the body POST and PATCH answer with. */
export const sopGroupDetailResponseSchema = sopGroupRowResponseSchema.extend({
  designation_name: z.string().nullish(),
  role_name: z.string().nullish(),
  items: z.array(sopItemResponseSchema),
})

/** GET /sop-groups/options — a BARE array, not `{ items }`. */
export const sopGroupOptionsResponseSchema = z.array(z.object({ id: z.number(), name: z.string() }))

const customTaskResponseSchema = sopItemResponseSchema.extend({
  has_started_work: z.boolean(),
})

/** GET /sop-groups/:id/assignees — ACTIVE assignments only, unpaged. */
export const sopGroupAssigneesResponseSchema = z.object({
  items: z.array(
    z.object({
      assignment_id: z.number(),
      /** Exactly one is set: an employee (designation group) or a panel user (role group). */
      employee_id: z.number().nullable(),
      user_id: z.number().nullish(),
      /** The person's name from EITHER master, despite the field name. */
      employee_name: z.string(),
      employee_code: z.string().nullish(),
      department_name: z.string().nullish(),
      effective_from: z.string(),
      effective_to: z.string().nullable(),
      has_started_work: z.boolean(),
      can_remove: z.boolean(),
      held_checklist: z.array(sopItemResponseSchema),
      custom_tasks: z.array(customTaskResponseSchema),
    }),
  ),
})

export const saveAssigneesResponseSchema = z.object({
  assigned: z.number(),
  updated: z.number(),
})

export type SopGroupRowResponse = z.infer<typeof sopGroupRowResponseSchema>
export type SopGroupDetailResponse = z.infer<typeof sopGroupDetailResponseSchema>
export type SopGroupAssigneeResponse = z.infer<
  typeof sopGroupAssigneesResponseSchema
>['items'][number]

// ── Payloads ───────────────────────────────────────────────────────────────

/** One checklist line / custom task on a write. With `id` = update, without = create. */
export interface SopItemPayload {
  id?: number
  task: string
  description: string
  frequency: number
  photo_required: boolean
  needs_approval: boolean
}

/** POST / PATCH /sop-groups — `sort_order` is server-assigned and never sent. */
export interface SopGroupPayload {
  name: string
  pick_by: 'designation' | 'role'
  designation_id?: number
  role_id?: number
  items: SopItemPayload[]
}

/** PUT /sop-groups/:id/assignees — one atomic call for tab 2's Save. */
export interface SopGroupAssigneesPayload {
  /** Required when `add` is non-empty, ignored otherwise. */
  effective_from?: string
  effective_to?: string | null
  /** `employee_id` on a designation group, `user_id` on a role group — never both. */
  add: (({ employee_id: number } | { user_id: number }) & { custom_tasks: SopItemPayload[] })[]
  update: { assignment_id: number; custom_tasks: SopItemPayload[] }[]
}

// ── Form ───────────────────────────────────────────────────────────────────

/**
 * One task line — a checklist item, or a custom task. `id` is '' until saved.
 * `hasStartedWork` marks a custom task somebody has worked: read-only, and it
 * can't be removed.
 */
const taskSchema = z.object({
  id: z.string(),
  task: z.string().trim().min(1, 'Task name is required').max(255, 'Keep it under 255 characters'),
  description: z.string().trim().max(500, 'Keep it under 500 characters'),
  frequency: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Whole number only')
    .refine(
      (v) => Number(v) >= FREQUENCY_MIN && Number(v) <= FREQUENCY_MAX,
      `${FREQUENCY_MIN}–${FREQUENCY_MAX}`,
    ),
  photoRequired: z.boolean(),
  needsApproval: z.boolean(),
  hasStartedWork: z.boolean(),
})

/**
 * One employee on the Assign tab. `locked` marks someone already running this
 * group (`assignmentId` is theirs): they aren't re-assigned, but their custom
 * tasks can still be edited, and a save sends them as an `update`.
 * `heldChecklist` is the copy they were given — which may be older than the
 * group's current checklist. `canRemove` is false once they've started work.
 */
const assigneeSchema = z.object({
  /**
   * The PERSON's id — an employee id on a designation group, a panel user id on
   * a role group. The save posts it under the field `pick_by` names.
   */
  employeeId: z.string(),
  employeeName: z.string(),
  employeeCode: z.string(),
  locked: z.boolean(),
  assignmentId: z.string(),
  canRemove: z.boolean(),
  /** The period their assignment already runs for — shown, never sent (''/'' for a new pick). */
  effectiveFrom: z.string(),
  effectiveTo: z.string(),
  heldChecklist: z.array(taskSchema),
  customTasks: z.array(taskSchema),
})

/**
 * The whole Add / Edit SOP Group screen — both tabs in one form. Each tab has
 * its own API, so a save writes the group first and then its assignments.
 */
export const sopGroupSchema = z
  .object({
    // Tab 1 — group details + checklist
    name: z.string().trim().min(2, 'Group name is required').max(120, 'Keep it under 120 characters'),
    pickBy: z.enum(['designation', 'role']),
    designationId: z.string(),
    roleId: z.string(),
    items: z.array(taskSchema).min(1, 'Add at least one checklist task'),
    // Tab 2 — assign employees
    assignees: z.array(assigneeSchema),
    effectiveFrom: z.string(),
    effectiveTo: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.pickBy === 'designation' && !v.designationId) {
      ctx.addIssue({ code: 'custom', path: ['designationId'], message: 'Designation is required' })
    }
    if (v.pickBy === 'role' && !v.roleId) {
      ctx.addIssue({ code: 'custom', path: ['roleId'], message: 'Role is required' })
    }

    const checklist = new Map<string, number>()
    v.items.forEach((item, index) => {
      const key = item.task.trim().toLowerCase()
      if (!key) return
      const first = checklist.get(key)
      if (first !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['items', index, 'task'], message: `Same as task ${first + 1}` })
      } else {
        checklist.set(key, index)
      }
    })

    // A custom task may not repeat the checklist that employee runs, or another
    // custom task of theirs.
    v.assignees.forEach((a, ai) => {
      const seen = new Set(
        a.locked ? a.heldChecklist.map((t) => t.task.trim().toLowerCase()) : checklist.keys(),
      )
      a.customTasks.forEach((t, ti) => {
        const key = t.task.trim().toLowerCase()
        if (!key) return
        if (seen.has(key)) {
          ctx.addIssue({
            code: 'custom',
            path: ['assignees', ai, 'customTasks', ti, 'task'],
            message: 'Already in this employee’s list',
          })
        }
        seen.add(key)
      })
    })

    if (v.assignees.some((a) => !a.locked)) {
      if (!v.effectiveFrom) {
        ctx.addIssue({ code: 'custom', path: ['effectiveFrom'], message: 'Effective from is required' })
      }
      if (v.effectiveFrom && v.effectiveTo && v.effectiveTo < v.effectiveFrom) {
        ctx.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'Must be on or after the start date' })
      }
    }
  })

export type SopGroupFormValues = z.infer<typeof sopGroupSchema>
export type SopTaskFormValues = SopGroupFormValues['items'][number]
export type SopAssigneeFormValues = SopGroupFormValues['assignees'][number]

/** The fields Tab 1 owns — checked before moving on to Tab 2. */
export const GROUP_TAB_FIELDS = ['name', 'pickBy', 'designationId', 'roleId', 'items'] as const
