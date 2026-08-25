import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { activeCompanyId } from '@/lib/active-company'
import { uploadFile } from '@/lib/uploads'
import type { PageParams, Paginated } from '@/lib/pagination'
import { LEAVE_ATTACHMENT_CONTENT_TYPES, LEAVE_DEFAULT_SORT } from '../constants'
import {
  leaveApplicationResponseSchema,
  leaveBalanceResponseSchema,
  leaveListResponseSchema,
  leaveResponseSchema,
} from '../schemas'
import {
  leaveDecisionToPayload,
  leaveToPayload,
  toLeave,
  toLeaveApplication,
  toLeaveBalance,
  type LeavePayloadMode,
} from '../lib/leave-mappers'
import type {
  LeaveDecisionFormValues,
  LeaveDecisionPayload,
  LeaveFormValues,
  LeavePayload,
} from '../schemas'
import type { Leave, LeaveApplication, LeaveBalance } from '../types'

/**
 * `/user/employee-leaves` — the company-wide leave register.
 *
 * A top-level collection rather than a sub-resource of an employee: the same
 * endpoint answers one employee's history (`employee_id`) and the whole company's
 * queue, which is what this module lists.
 *
 * **The writes answer an APPLICATION, not a row.** One request can become two
 * rows — a paid one and an unpaid one — because the server spends the leave
 * type's yearly allowance and lets the rest fall through as unpaid. Nothing here
 * ever sends a `pay_type`.
 */

/** The filters the register narrows by, beyond the page itself. */
export interface LeaveFilters {
  /** One employee's own history; leave it off for the company-wide register. */
  employeeId?: number
  status?: string
  leaveTypeId?: number
  payType?: string
  duration?: string
  /** An overlap window — a leave straddling it is in it. */
  fromDate?: string
  toDate?: string
  /**
   * Your own queue. Implies `status=PENDING`.
   *
   * For an approver it is the companies where you are the level that answered.
   * FOR THE OWNER it is the FALL-THROUGH — the companies no level covers, i.e.
   * the ones only they can clear.
   *
   * VISIBILITY IS NOT ROUTING: the plain list is unchanged, and the owner goes on
   * seeing every company's rows whether or not any hierarchy user can. The
   * hierarchy decides who may APPROVE, never who may LOOK.
   */
  pendingWithMe?: boolean
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
        ...(filters.duration ? { duration: filters.duration } : {}),
        ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
        ...(filters.toDate ? { to_date: filters.toDate } : {}),
        ...(filters.pendingWithMe ? { pending_with_me: true } : {}),
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
 *
 * Answers the APPLICATION with the split the server decided — read `paidDays` /
 * `unpaidDays` off it rather than assuming the whole range was paid.
 */
export async function createLeave(values: LeaveFormValues): Promise<LeaveApplication> {
  try {
    const raw = await http.post<unknown, LeavePayload>(
      endpoints.EMPLOYEE_LEAVES.POST,
      leaveToPayload(values, 'create'),
    )
    return toLeaveApplication(leaveApplicationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't record the leave.")
  }
}

/**
 * PATCH /user/employee-leaves/:id — edit a leave.
 *
 * `mode` picks which of the endpoint's two behaviours is being asked for:
 *
 * - `schedule` re-runs the split, so the application's rows are REWRITTEN and
 *   their ids change. Only a `PENDING` application accepts it — a decided one
 *   answers 409: its dates are settled and it has to be removed and refiled.
 * - `notes` writes the reason and the attachment to every row, ids untouched, at
 *   any status.
 *
 * Either way the answer is the whole application: re-bind from it rather than
 * assuming the id that was sent still exists.
 */
export async function updateLeave(
  id: number,
  values: LeaveFormValues,
  mode: Extract<LeavePayloadMode, 'schedule' | 'notes'>,
): Promise<LeaveApplication> {
  try {
    const raw = await http.patch<unknown, LeavePayload>(
      endpoints.EMPLOYEE_LEAVES.PATCH(id),
      leaveToPayload(values, mode),
    )
    return toLeaveApplication(leaveApplicationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the leave.")
  }
}

/**
 * DELETE /user/employee-leaves/:id — removes the WHOLE application, both halves
 * of a split, whichever of its rows the id names.
 */
export async function deleteLeave(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEE_LEAVES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't remove the leave.")
  }
}

/**
 * PATCH /user/employee-leaves/:id/status — approve or reject.
 *
 * Any one row's id moves the whole application and the employee gets ONE
 * notification covering the full range. Only a `PENDING` application can be
 * decided: the employee has already been told the first answer, so undoing means
 * deleting and recording again.
 */
export async function decideLeave(
  id: number,
  values: LeaveDecisionFormValues,
): Promise<LeaveApplication> {
  try {
    const raw = await http.patch<unknown, LeaveDecisionPayload>(
      endpoints.EMPLOYEE_LEAVES.STATUS(id),
      leaveDecisionToPayload(values),
    )
    return toLeaveApplication(leaveApplicationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't record the decision.")
  }
}

/**
 * GET /user/employee-leaves/balance — one employee's paid allowance for a year.
 *
 * Read it to WARN, never to block: running out of allowance doesn't refuse an
 * application, it only stops paying for it.
 */
export async function fetchLeaveBalance(
  employeeId: number,
  year: number,
): Promise<LeaveBalance> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEE_LEAVES.BALANCE, {
      params: { employee_id: employeeId, year },
    })
    return toLeaveBalance(leaveBalanceResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the leave balance.")
  }
}

/**
 * POST /user/uploads/leave-attachment, then the presigned PUT — answers the object
 * `key` to store as `attachment`. The file itself never reaches the leave
 * endpoints, and the handshake writes nothing, so an abandoned upload is harmless.
 */
export async function uploadLeaveAttachment(file: File): Promise<string> {
  return uploadFile(
    endpoints.UPLOADS.LEAVE_ATTACHMENT,
    file,
    LEAVE_ATTACHMENT_CONTENT_TYPES,
  )
}
