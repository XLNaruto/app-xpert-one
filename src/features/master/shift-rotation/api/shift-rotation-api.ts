import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { SHIFT_ROTATION_DEFAULT_SORT } from '../constants'
import {
  shiftRotationResponseSchema,
  shiftRotationsResponseSchema,
} from '../schemas'
import {
  shiftRotationToPayload,
  toShiftRotation,
} from '../lib/shift-rotation-mappers'
import type {
  ShiftRotationFormValues,
  ShiftRotationPayload,
  ShiftRotationUpdatePayload,
} from '../schemas'
import type { ShiftRotation } from '../types'

/**
 * Rotation cycles — `/user/shift-rotations`. Offset-paginated (`?limit=&offset=`,
 * limit capped at 100) answering `{ items, total }`, each row carrying its whole
 * cycle. `search` is matched server-side against the rotation name and `sort`
 * accepts `name`, `cycle_length_weeks` or `created_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body; every
 * shift in the cycle must belong to that same company.
 */

/** What `activeCompanyId` names in its error when no company is selected. */
const WHAT = 'shift rotations'

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/** The tenant a read is scoped to — the company on screen, or the session's. */
function tenantId(companyId: number | undefined): number {
  return companyId ?? activeCompanyId(WHAT)
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
    sort: params.sort ?? SHIFT_ROTATION_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (SHIFT_ROTATION_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/shift-rotations — one page of a company's rotations.
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered. That's what the
 * employee tab's rotation dropdown reads.
 */
export async function fetchShiftRotations(
  params: PageParams = ALL_ROWS,
  companyId?: number,
): Promise<Paginated<ShiftRotation>> {
  try {
    const query = queryParams(params, companyId)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.SHIFT_ROTATIONS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = shiftRotationsResponseSchema.parse(raw)
      return { items: items.map(toShiftRotation), total }
    }

    const collected: ShiftRotation[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.SHIFT_ROTATIONS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = shiftRotationsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toShiftRotation))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load shift rotations.")
  }
}

/** GET /user/shift-rotations/:id — one rotation with its whole cycle. */
export async function fetchShiftRotation(id: number): Promise<ShiftRotation> {
  try {
    const raw = await http.get<unknown>(endpoints.SHIFT_ROTATIONS.GET(id))
    return toShiftRotation(shiftRotationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Shift rotation not found')
  }
}

/** POST /user/shift-rotations — add a rotation to the company. */
export async function createShiftRotation(
  values: ShiftRotationFormValues,
  companyId?: number,
): Promise<ShiftRotation> {
  try {
    const raw = await http.post<unknown, ShiftRotationPayload>(
      endpoints.SHIFT_ROTATIONS.POST,
      {
        company_id: tenantId(companyId),
        ...shiftRotationToPayload(values),
      },
    )
    return toShiftRotation(shiftRotationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the shift rotation.")
  }
}

/**
 * PATCH /user/shift-rotations/:id — the endpoint accepts a partial body, but the
 * form always submits the whole record. `weeks` is sent every time, which replaces
 * the cycle: the editor holds the complete cycle, and the API validates it against
 * `cycle_length_weeks` whichever of the two moved.
 */
export async function updateShiftRotation(
  id: number,
  values: ShiftRotationFormValues,
): Promise<ShiftRotation> {
  try {
    const raw = await http.patch<unknown, ShiftRotationUpdatePayload>(
      endpoints.SHIFT_ROTATIONS.PATCH(id),
      shiftRotationToPayload(values),
    )
    return toShiftRotation(shiftRotationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the shift rotation.")
  }
}

/**
 * DELETE /user/shift-rotations/:id — refused with 409 while employees are still
 * assigned to it, since they would go on cycling through a rotation no screen
 * shows. The server's reason is what the screen displays.
 */
export async function deleteShiftRotation(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.SHIFT_ROTATIONS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the shift rotation.")
  }
}
