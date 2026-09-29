import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import type { PageParams, Paginated } from '@/lib/pagination'
import {
  pageQuery,
  requireCompany,
  toOfficeTaskError,
  toSopTask,
  type SopTask,
} from '@/features/office-task/common'
import { SOP_ASSIGNMENT_DEFAULT_SORT } from '../constants'
import {
  sopAssignmentDetailResponseSchema,
  sopAssignmentItemsResponseSchema,
  sopAssignmentListResponseSchema,
  sopAssignmentRunsResponseSchema,
  startAssignmentResponseSchema,
} from '../schemas'
import {
  toSopAssignmentDetail,
  toSopAssignmentItem,
  toSopAssignmentRow,
} from '../lib/sop-assignment-mappers'
import type {
  SopAssignmentDetail,
  SopAssignmentFilters,
  SopAssignmentItem,
  SopAssignmentRow,
  SopRunRange,
} from '../types'

/**
 * `/user/office-task/sop-assignments` — who runs which SOP group. There is no
 * create: an assignment is only ever born on SOP Tasks tab 2.
 */

const { SOP_ASSIGNMENTS } = endpoints.OFFICE_TASK

/** GET /sop-assignments — search employee name / code / group name. */
export async function fetchSopAssignments(
  filters: SopAssignmentFilters,
  params: PageParams,
): Promise<Paginated<SopAssignmentRow>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(SOP_ASSIGNMENTS.LIST, {
      params: {
        ...pageQuery(params, SOP_ASSIGNMENT_DEFAULT_SORT),
        ...(filters.groupId ? { group_id: Number(filters.groupId) } : {}),
        // Omitted = both.
        ...(filters.status !== 'all' ? { status: filters.status } : {}),
      },
    })
    const { items, total } = sopAssignmentListResponseSchema.parse(raw)
    return { items: items.map(toSopAssignmentRow), total }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the assignments.")
  }
}

/** GET /sop-assignments/:id — section A, the header card. */
export async function fetchSopAssignment(id: number): Promise<SopAssignmentDetail> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(SOP_ASSIGNMENTS.GET(id))
    return toSopAssignmentDetail(sopAssignmentDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the assignment.")
  }
}

/**
 * GET /sop-assignments/:id/items — section B. Runs come from the nightly job;
 * this read also materialises TODAY (idempotently), which covers an assignment
 * created this morning whose first day is today.
 */
export async function fetchSopAssignmentItems(id: number): Promise<SopAssignmentItem[]> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(SOP_ASSIGNMENTS.ITEMS(id))
    return sopAssignmentItemsResponseSchema.parse(raw).items.map(toSopAssignmentItem)
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the assigned items.")
  }
}

/**
 * GET /sop-assignments/:id/runs — section C, inside `range` (inclusive). The
 * order is fixed server-side (date desc, task, slot, id); `search` is the task.
 */
export async function fetchSopAssignmentRuns(
  id: number,
  range: SopRunRange,
  params: PageParams,
): Promise<Paginated<SopTask>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(SOP_ASSIGNMENTS.RUNS(id), {
      params: { ...pageQuery(params), from: range.from, to: range.to },
    })
    const { items, total } = sopAssignmentRunsResponseSchema.parse(raw)
    return { items: items.map(toSopTask), total }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the task history.")
  }
}

/** POST /sop-assignments/:id/stop — always allowed; deletes nothing. */
export async function stopSopAssignment(id: number): Promise<void> {
  try {
    await http.post<unknown>(SOP_ASSIGNMENTS.STOP(id))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't stop the assignment.")
  }
}

/**
 * POST /sop-assignments/:id/start — answers the id NOW running, which is a NEW
 * assignment when days were skipped since the stop. Always follow the answer.
 */
export async function startSopAssignment(id: number): Promise<number> {
  try {
    const raw = await http.post<unknown>(SOP_ASSIGNMENTS.START(id))
    return startAssignmentResponseSchema.parse(raw).id
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't start the assignment.")
  }
}

/** DELETE /sop-assignments/:id — refused once anyone started work (R8). */
export async function deleteSopAssignment(id: number): Promise<void> {
  try {
    await http.delete<unknown>(SOP_ASSIGNMENTS.DELETE(id))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't delete the assignment.")
  }
}
