import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { SHIFT_DEFAULT_SORT } from '../constants'
import { shiftResponseSchema, shiftsResponseSchema } from '../schemas'
import { shiftToPayload, toShift } from '../lib/shift-mappers'
import type {
  ShiftDefaultScope,
  ShiftFormValues,
  ShiftPayload,
  ShiftUpdatePayload,
} from '../schemas'
import type { Shift } from '../types'

/**
 * Shifts — `/user/shifts`. Offset-paginated (`?limit=&offset=`, limit capped at
 * 100) answering `{ items, total }`, with `search` matched server-side against
 * the shift name and `sort` accepting `name`, `start_time`, `end_time` or
 * `created_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body. The
 * shift screens live inside the company and department masters, which edit a
 * company other than the session's active one — so callers pass the id of the
 * record on screen and only fall back to the session's company without it.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/** The tenant a read is scoped to — the company on screen, or the session's. */
function tenantId(companyId: number | undefined): number {
  return companyId ?? activeCompanyId('shifts')
}

/**
 * The tenant scope plus `search` / `sort` / `sort_by` as the endpoint spells
 * them. Order is always sent — left off, the server's own default decides it,
 * and a list whose order isn't pinned can repeat or skip rows as the user pages.
 */
function queryParams(params: PageParams, companyId?: number) {
  return {
    company_id: tenantId(companyId),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? SHIFT_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (SHIFT_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/shifts — one page of a company's shifts, earliest start first
 * unless the screen says otherwise.
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 */
export async function fetchShifts(
  params: PageParams = ALL_ROWS,
  companyId?: number,
): Promise<Paginated<Shift>> {
  try {
    const query = queryParams(params, companyId)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.SHIFTS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = shiftsResponseSchema.parse(raw)
      return { items: items.map(toShift), total }
    }

    const collected: Shift[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.SHIFTS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = shiftsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toShift))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load shifts.")
  }
}

/** GET /user/shifts/:id — one shift. */
export async function fetchShift(id: number): Promise<Shift> {
  try {
    const raw = await http.get<unknown>(endpoints.SHIFTS.GET(id))
    return toShift(shiftResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Shift not found')
  }
}

/** POST /user/shifts — add a shift to the company on screen. */
export async function createShift(
  values: ShiftFormValues,
  companyId?: number,
): Promise<Shift> {
  try {
    const raw = await http.post<unknown, ShiftPayload>(endpoints.SHIFTS.POST, {
      company_id: tenantId(companyId),
      ...shiftToPayload(values),
    })
    return toShift(shiftResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the shift.")
  }
}

/**
 * PATCH /user/shifts/:id — the endpoint accepts a partial body and the form
 * always submits every field it captures, so the whole record travels.
 * `is_night_shift` is re-derived server-side whenever either time moves.
 */
export async function updateShift(
  id: number,
  values: ShiftFormValues,
): Promise<Shift> {
  try {
    const raw = await http.patch<unknown, ShiftUpdatePayload>(
      endpoints.SHIFTS.PATCH(id),
      shiftToPayload(values),
    )
    return toShift(shiftResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the shift.")
  }
}

/**
 * DELETE /user/shifts/:id — refused with 409 while the shift is still a company
 * or department default, or referenced by a rotation, an assignment or a roster
 * entry. The server's reason is what the screen shows.
 */
export async function deleteShift(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.SHIFTS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the shift.")
  }
}

/**
 * POST /user/shifts/:id/set-default — make this the default shift for one
 * company or one department. Exactly one of the two ids travels: a department's
 * default wins over its company's.
 *
 * With a default in place an ordinary employee needs no per-person assignment at
 * all, which is the whole point of the setting.
 */
export async function setDefaultShift(
  shiftId: number,
  scope: ShiftDefaultScope,
): Promise<void> {
  try {
    await http.post<unknown, ShiftDefaultScope>(
      endpoints.SHIFTS.SET_DEFAULT(shiftId),
      scope,
    )
  } catch (error) {
    throw toApiError(error, "Couldn't set the default shift.")
  }
}

/**
 * POST /user/shifts/clear-default — drop the default of one company or one
 * department. A department with none falls back to its company's; a company with
 * none leaves its employees on the pre-shift behaviour.
 */
export async function clearDefaultShift(scope: ShiftDefaultScope): Promise<void> {
  try {
    await http.post<unknown, ShiftDefaultScope>(endpoints.SHIFTS.CLEAR_DEFAULT, scope)
  } catch (error) {
    throw toApiError(error, "Couldn't clear the default shift.")
  }
}
