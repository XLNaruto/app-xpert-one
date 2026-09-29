import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import type { PageParams, Paginated } from '@/lib/pagination'
import { pageQuery, requireCompany, toOfficeTaskError } from '@/features/office-task/common'
import { SOP_GROUP_DEFAULT_SORT } from '../constants'
import {
  saveAssigneesResponseSchema,
  sopGroupAssigneesResponseSchema,
  sopGroupDetailResponseSchema,
  sopGroupListResponseSchema,
  sopGroupOptionsResponseSchema,
  type SopGroupAssigneesPayload,
  type SopGroupFormValues,
  type SopGroupPayload,
} from '../schemas'
import {
  assigneesToPayload,
  sopGroupToPayload,
  toSopGroupAssignee,
  toSopGroupDetail,
  toSopGroupRow,
} from '../lib/sop-group-mappers'
import type {
  SaveAssigneesResult,
  SopGroupAssignee,
  SopGroupDetail,
  SopGroupOption,
  SopGroupRow,
} from '../types'

/**
 * `/user/office-task/sop-groups` — SOP Tasks, both tabs. Tab 1 is the group and
 * its checklist; tab 2 is who runs it, saved in one atomic PUT. Deletes on the
 * edit screen (a checklist line, an assignee, a custom task) go out straight
 * away after a confirm rather than riding on Save.
 */

const { SOP_GROUPS, SOP_ASSIGNMENTS } = endpoints.OFFICE_TASK

/** GET /sop-groups — searched on name and applies-to, newest first by default. */
export async function fetchSopGroups(params: PageParams): Promise<Paginated<SopGroupRow>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(SOP_GROUPS.LIST, {
      params: pageQuery(params, SOP_GROUP_DEFAULT_SORT),
    })
    const { items, total } = sopGroupListResponseSchema.parse(raw)
    return { items: items.map(toSopGroupRow), total }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the SOP groups.")
  }
}

/** GET /sop-groups/options — every group as `{ id, name }`, for filters. */
export async function fetchSopGroupOptions(): Promise<SopGroupOption[]> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(SOP_GROUPS.OPTIONS)
    return sopGroupOptionsResponseSchema.parse(raw)
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the SOP groups.")
  }
}

/** GET /sop-groups/:id — the group with its checklist. */
export async function fetchSopGroup(id: number): Promise<SopGroupDetail> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(SOP_GROUPS.GET(id))
    return toSopGroupDetail(sopGroupDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the SOP group.")
  }
}

/** POST /sop-groups — answers the full group, an id on every item. */
export async function createSopGroup(values: SopGroupFormValues): Promise<SopGroupDetail> {
  try {
    const raw = await http.post<unknown, SopGroupPayload>(SOP_GROUPS.POST, sopGroupToPayload(values))
    return toSopGroupDetail(sopGroupDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't create the SOP group.")
  }
}

/**
 * PATCH /sop-groups/:id — `items` upserts (rows left out are KEPT). Posting the
 * same target back while it's locked is not a retarget and passes.
 */
export async function updateSopGroup(input: {
  id: number
  values: SopGroupFormValues
}): Promise<SopGroupDetail> {
  try {
    const raw = await http.patch<unknown, SopGroupPayload>(
      SOP_GROUPS.PATCH(input.id),
      sopGroupToPayload(input.values),
    )
    return toSopGroupDetail(sopGroupDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't update the SOP group.")
  }
}

/**
 * DELETE /sop-groups/:id — refused (409 TASK_STARTED) once anyone has worked a
 * run; otherwise the group, its assignments and their un-started runs go.
 */
export async function deleteSopGroup(id: number): Promise<void> {
  try {
    await http.delete<unknown>(SOP_GROUPS.DELETE(id))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't delete the SOP group.")
  }
}

/** DELETE /sop-groups/:id/items/:itemId — allowed after work has started (R3); not the last line. */
export async function deleteSopGroupItem(input: { groupId: number; itemId: number }): Promise<void> {
  try {
    await http.delete<unknown>(SOP_GROUPS.ITEM(input.groupId, input.itemId))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't remove the checklist task.")
  }
}

/** GET /sop-groups/:id/assignees — who runs it now, with their held copy and customs. */
export async function fetchSopGroupAssignees(id: number): Promise<SopGroupAssignee[]> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(SOP_GROUPS.ASSIGNEES(id))
    return sopGroupAssigneesResponseSchema.parse(raw).items.map(toSopGroupAssignee)
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the assigned employees.")
  }
}

/** PUT /sop-groups/:id/assignees — all-or-nothing: one refused row saves nothing. */
export async function saveSopGroupAssignees(input: {
  id: number
  values: SopGroupFormValues
}): Promise<SaveAssigneesResult> {
  try {
    const raw = await http.put<unknown, SopGroupAssigneesPayload>(
      SOP_GROUPS.ASSIGNEES(input.id),
      assigneesToPayload(input.values),
    )
    return saveAssigneesResponseSchema.parse(raw)
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't save the assigned employees.")
  }
}

/** DELETE /sop-groups/:id/assignees/:assignmentId — refused once they've started (R6). */
export async function removeSopGroupAssignee(input: {
  groupId: number
  assignmentId: number
}): Promise<void> {
  try {
    await http.delete<unknown>(SOP_GROUPS.ASSIGNEE(input.groupId, input.assignmentId))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't remove the employee.")
  }
}

/**
 * DELETE /sop-assignments/:id/custom-tasks/:itemId — a tab 2 action despite the
 * path. Refused once the task has been started (R5).
 */
export async function deleteCustomTask(input: { assignmentId: number; itemId: number }): Promise<void> {
  try {
    await http.delete<unknown>(SOP_ASSIGNMENTS.CUSTOM_TASK(input.assignmentId, input.itemId))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't remove the custom task.")
  }
}
