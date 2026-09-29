import { targetPayload, toAudit, toSopItem, type SopItem } from '@/features/office-task/common'
import type {
  SopGroupAssigneeResponse,
  SopGroupAssigneesPayload,
  SopGroupDetailResponse,
  SopGroupFormValues,
  SopGroupPayload,
  SopGroupRowResponse,
  SopItemPayload,
  SopTaskFormValues,
} from '../schemas'
import type { SopGroupAssignee, SopGroupDetail, SopGroupRow } from '../types'

// ── Responses ──────────────────────────────────────────────────────────────

export function toSopGroupRow(r: SopGroupRowResponse): SopGroupRow {
  return {
    ...toAudit(r),
    id: r.id,
    name: r.name,
    pickBy: r.pick_by,
    designationId: r.designation_id,
    roleId: r.role_id,
    appliesTo: r.applies_to ?? '',
    sortOrder: r.sort_order ?? 0,
    itemsCount: r.items_count ?? 0,
    tasksPerDay: r.tasks_per_day,
    anyPhoto: r.any_photo ?? false,
    anyApproval: r.any_approval ?? false,
    activeAssignees: r.active_assignees,
    hasStartedWork: r.has_started_work,
    canDelete: r.can_delete,
    targetLocked: r.target_locked ?? r.active_assignees > 0,
  }
}

export function toSopGroupDetail(r: SopGroupDetailResponse): SopGroupDetail {
  const items = r.items.map(toSopItem)
  return {
    ...toSopGroupRow(r),
    itemsCount: r.items_count ?? items.length,
    designationName: r.designation_name ?? '',
    roleName: r.role_name ?? '',
    items,
  }
}

export function toSopGroupAssignee(r: SopGroupAssigneeResponse): SopGroupAssignee {
  return {
    assignmentId: r.assignment_id,
    personId: r.employee_id ?? r.user_id ?? 0,
    employeeId: r.employee_id,
    userId: r.user_id ?? null,
    employeeName: r.employee_name,
    employeeCode: r.employee_code ?? '',
    departmentName: r.department_name ?? '',
    effectiveFrom: r.effective_from,
    effectiveTo: r.effective_to,
    hasStartedWork: r.has_started_work,
    canRemove: r.can_remove,
    heldChecklist: r.held_checklist.map(toSopItem),
    customTasks: r.custom_tasks.map((t) => ({ ...toSopItem(t), hasStartedWork: t.has_started_work })),
  }
}

// ── Form ───────────────────────────────────────────────────────────────────

const itemToForm = (i: SopItem, hasStartedWork = false): SopTaskFormValues => ({
  id: String(i.id),
  task: i.task,
  description: i.description,
  frequency: String(i.frequency),
  photoRequired: i.photoRequired,
  needsApproval: i.needsApproval,
  hasStartedWork,
})

/** Tab 1's fields from `GET /sop-groups/:id` (or the body a save answered with). */
export function groupToFormFields(
  g: SopGroupDetail,
): Pick<SopGroupFormValues, 'name' | 'pickBy' | 'designationId' | 'roleId' | 'items'> {
  return {
    name: g.name,
    pickBy: g.pickBy,
    designationId: g.designationId ? String(g.designationId) : '',
    roleId: g.roleId ? String(g.roleId) : '',
    items: g.items.map((i) => itemToForm(i)),
  }
}

/**
 * Tab 2's people from `GET /sop-groups/:id/assignees`. Everyone already running
 * the group comes in locked, with their held checklist and custom tasks.
 */
export function assigneesToFormValues(assignees: SopGroupAssignee[]): SopGroupFormValues['assignees'] {
  return assignees.map((a) => ({
    employeeId: String(a.personId),
    employeeName: a.employeeName,
    employeeCode: a.employeeCode,
    locked: true,
    assignmentId: String(a.assignmentId),
    canRemove: a.canRemove,
    effectiveFrom: a.effectiveFrom,
    effectiveTo: a.effectiveTo ?? '',
    heldChecklist: a.heldChecklist.map((i) => itemToForm(i)),
    customTasks: a.customTasks.map((t) => itemToForm(t, t.hasStartedWork)),
  }))
}

/**
 * The Period to open tab 2 on, from the people already running the group —
 * so a new pick joins them for the same stretch. The start never lies in the
 * past (a new assignment can't back-fill days), and an end already gone is
 * dropped. `null` when nobody is assigned yet.
 */
export function periodFromAssignees(
  assignees: SopGroupAssignee[],
  today: string,
): { effectiveFrom: string; effectiveTo: string } | null {
  const first = assignees[0]
  if (!first) return null
  const effectiveFrom = first.effectiveFrom > today ? first.effectiveFrom : today
  const effectiveTo = first.effectiveTo && first.effectiveTo >= effectiveFrom ? first.effectiveTo : ''
  return { effectiveFrom, effectiveTo }
}

// ── Payloads ───────────────────────────────────────────────────────────────

/** A form line as the API's item — with `id` it updates, without it creates. */
export function itemToPayload(i: SopTaskFormValues): SopItemPayload {
  return {
    ...(i.id ? { id: Number(i.id) } : {}),
    task: i.task.trim(),
    description: i.description.trim(),
    frequency: Number(i.frequency),
    photo_required: i.photoRequired,
    needs_approval: i.needsApproval,
  }
}

/** Tab 1 — POST / PATCH /sop-groups. PATCH's `items` is an upsert; rows left out are kept. */
export function sopGroupToPayload(v: SopGroupFormValues): SopGroupPayload {
  return {
    name: v.name.trim(),
    ...targetPayload(v.pickBy, v.designationId, v.roleId),
    items: v.items.map(itemToPayload),
  }
}

/**
 * Tab 2 — PUT /sop-groups/:id/assignees. New people go in `add` (they get a copy
 * of the group's CURRENT checklist plus their customs); people already running
 * it go in `update` with their whole custom list — a started task posted back
 * unchanged passes, so the form can always send everything.
 */
export function assigneesToPayload(v: SopGroupFormValues): SopGroupAssigneesPayload {
  const add = v.assignees
    .filter((a) => !a.locked)
    .map((a) => ({
      // A role group's people are panel users — the id goes under `user_id`.
      ...(v.pickBy === 'role' ? { user_id: Number(a.employeeId) } : { employee_id: Number(a.employeeId) }),
      custom_tasks: a.customTasks.map(itemToPayload),
    }))
  const update = v.assignees
    .filter((a) => a.locked && a.assignmentId)
    .map((a) => ({ assignment_id: Number(a.assignmentId), custom_tasks: a.customTasks.map(itemToPayload) }))
  return {
    ...(add.length ? { effective_from: v.effectiveFrom, effective_to: v.effectiveTo || null } : {}),
    add,
    update,
  }
}
