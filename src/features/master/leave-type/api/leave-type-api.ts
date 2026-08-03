import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { LEAVE_TYPE_DEFAULT_SORT } from '../constants'
import { leaveTypeResponseSchema, leaveTypesResponseSchema } from '../schemas'
import { leaveTypeToPayload, toLeaveType } from '../lib/leave-type-mappers'
import type {
  LeaveTypeFormValues,
  LeaveTypePayload,
  LeaveTypeUpdatePayload,
} from '../schemas'
import type { LeaveType } from '../types'

/**
 * Leave types — `/user/leave-types`. The endpoint is offset-paginated
 * (`?limit=&offset=`, limit capped at 100) and answers `{ items, total }`,
 * which is exactly the shape the list screen pages in. `search` is matched
 * server-side against the short code and the name, and `sort` accepts
 * `short_code`, `name` or `created_at`.
 *
 * Unlike the rate masters, this one is explicitly tenant-scoped: reads take a
 * required `company_id` and a create carries it in the body, both taken from
 * the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/leave-types — one page of the company's leave catalog, in the
 * requested order (short code A→Z unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 *
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 */
export async function fetchLeaveTypes(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<LeaveType>> {
  try {
    const query = {
      company_id: activeCompanyId('leave types'),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      sort: params.sort ?? LEAVE_TYPE_DEFAULT_SORT.id,
      sort_by: params.sortBy ?? (LEAVE_TYPE_DEFAULT_SORT.desc ? 'desc' : 'asc'),
    }

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.LEAVE_TYPES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = leaveTypesResponseSchema.parse(raw)
      return { items: items.map(toLeaveType), total }
    }

    const collected: LeaveType[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.LEAVE_TYPES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = leaveTypesResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toLeaveType))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load leave types.")
  }
}

/** GET /user/leave-types/:id — one leave type, for the edit form. */
export async function fetchLeaveType(id: number): Promise<LeaveType> {
  try {
    const raw = await http.get<unknown>(endpoints.LEAVE_TYPES.GET(id))
    return toLeaveType(leaveTypeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Leave type not found')
  }
}

/** POST /user/leave-types — add a leave type to the active company's catalog. */
export async function createLeaveType(values: LeaveTypeFormValues): Promise<LeaveType> {
  try {
    const raw = await http.post<unknown, LeaveTypePayload>(endpoints.LEAVE_TYPES.POST, {
      company_id: activeCompanyId('leave types'),
      ...leaveTypeToPayload(values),
    })
    return toLeaveType(leaveTypeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the leave type.")
  }
}

/**
 * PATCH /user/leave-types/:id — the endpoint accepts a partial body, but the
 * form always submits every field, so we send the whole record.
 */
export async function updateLeaveType(
  id: number,
  values: LeaveTypeFormValues,
): Promise<LeaveType> {
  try {
    const raw = await http.patch<unknown, LeaveTypeUpdatePayload>(
      endpoints.LEAVE_TYPES.PATCH(id),
      leaveTypeToPayload(values),
    )
    return toLeaveType(leaveTypeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the leave type.")
  }
}

/** DELETE /user/leave-types/:id — remove a leave type from the catalog. */
export async function deleteLeaveType(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.LEAVE_TYPES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the leave type.")
  }
}
