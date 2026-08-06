import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { activeCompanyId } from '@/lib/active-company'
import type { PageParams, Paginated } from '@/lib/pagination'
import { LEAVE_DEFAULT_SORT } from '../constants'
import { leaveListResponseSchema, leaveResponseSchema } from '../schemas'
import { leaveDecisionToPayload, leaveToPayload, toLeave } from '../lib/leave-mappers'
import type {
  LeaveDecisionFormValues,
  LeaveDecisionPayload,
  LeaveFormValues,
  LeavePayload,
} from '../schemas'
import type { Leave } from '../types'

/**
 * `/user/employee-leaves` — the company-wide leave register.
 *
 * A top-level collection rather than a sub-resource of an employee: the same
 * endpoint answers one employee's history (`employee_id`) and the whole company's
 * queue, which is what this module lists.
 */

/** The filters the register narrows by, beyond the page itself. */
export interface LeaveFilters {
  /** One employee's own history; leave it off for the company-wide register. */
  employeeId?: number
  status?: string
  leaveTypeId?: number
  payType?: string
  /** An overlap window — a leave straddling it is in it. */
  fromDate?: string
  toDate?: string
}

/** The API's maximum `limit` on the leave register. */
const LEAVE_MAX_LIMIT = 100

/** The API's maximum length for the free-text `search`. */
const SEARCH_MAX_LENGTH = 100

/** GET /user/employee-leaves — one page of leave records, newest first. */
export async function fetchLeaves(
  params: PageParams,
  filters: LeaveFilters = {},
): Promise<Paginated<Leave>> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEE_LEAVES.LIST, {
      params: {
        company_id: activeCompanyId('leave records'),
        limit: params.limit < 0 ? LEAVE_MAX_LIMIT : Math.min(params.limit, LEAVE_MAX_LIMIT),
        offset: params.offset,
        ...(filters.employeeId ? { employee_id: filters.employeeId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.leaveTypeId ? { leave_type_id: filters.leaveTypeId } : {}),
        ...(filters.payType ? { pay_type: filters.payType } : {}),
        ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
        ...(filters.toDate ? { to_date: filters.toDate } : {}),
        // The endpoint caps `search` at 100 characters and 400s past it.
        ...(params.search?.trim()
          ? { search: params.search.trim().slice(0, SEARCH_MAX_LENGTH) }
          : {}),
        // Always send an order, or paging can repeat or skip rows.
        sort: params.sort ?? LEAVE_DEFAULT_SORT.id,
        sort_by: params.sortBy ?? (LEAVE_DEFAULT_SORT.desc ? 'desc' : 'asc'),
      },
    })
    const { items, total } = leaveListResponseSchema.parse(raw)
    return { items: items.map(toLeave), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load the leave records.")
  }
}

/** GET /user/employee-leaves/:id — the one record the edit screen seeds from. */
export async function fetchLeave(id: number): Promise<Leave> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEE_LEAVES.GET(id))
    return toLeave(leaveResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the leave record.")
  }
}

/**
 * POST /user/employee-leaves — record a leave. `status` defaults to `APPROVED`:
 * the back office recording a leave *is* the approval, and `PENDING` files it for
 * a decision later.
 */
export async function createLeave(values: LeaveFormValues): Promise<Leave> {
  try {
    const raw = await http.post<unknown, LeavePayload>(
      endpoints.EMPLOYEE_LEAVES.POST,
      leaveToPayload(values, { isCreate: true }),
    )
    return toLeave(leaveResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't record the leave.")
  }
}

/**
 * PATCH /user/employee-leaves/:id — edit a leave. Neither the employee nor the
 * status is editable here; a decision goes through `decideLeave`.
 */
export async function updateLeave(id: number, values: LeaveFormValues): Promise<Leave> {
  try {
    const raw = await http.patch<unknown, LeavePayload>(
      endpoints.EMPLOYEE_LEAVES.PATCH(id),
      leaveToPayload(values, { isCreate: false }),
    )
    return toLeave(leaveResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the leave.")
  }
}

export async function deleteLeave(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEE_LEAVES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't remove the leave.")
  }
}

/**
 * PATCH /user/employee-leaves/:id/status — approve or reject. Only a `PENDING`
 * row can be decided: the employee has already been told the first answer, and
 * the row records who gave it. Undoing means deleting and recording again.
 */
export async function decideLeave(
  id: number,
  values: LeaveDecisionFormValues,
): Promise<Leave> {
  try {
    const raw = await http.patch<unknown, LeaveDecisionPayload>(
      endpoints.EMPLOYEE_LEAVES.STATUS(id),
      leaveDecisionToPayload(values),
    )
    return toLeave(leaveResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't record the decision.")
  }
}
