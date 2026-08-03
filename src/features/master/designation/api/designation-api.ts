import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { DESIGNATION_DEFAULT_SORT } from '../constants'
import {
  designationDetailResponseSchema,
  designationResponseSchema,
  designationsResponseSchema,
} from '../schemas'
import {
  designationNameToPayload,
  designationToPayload,
  toDesignation,
  toDesignationDetail,
} from '../lib/designation-mappers'
import type {
  DesignationFormValues,
  DesignationPayload,
  DesignationUpdatePayload,
} from '../schemas'
import type { Designation } from '../types'

/**
 * Designations — `/user/designations`. The endpoint is offset-paginated
 * (`?limit=&offset=`, limit capped at 100) and answers `{ items, total }`.
 * `search` is a case-insensitive partial match on the title, and `sort` accepts
 * `name` or `created_at`.
 *
 * The resource is split in two, and this file keeps that split:
 *
 * - The **title** lives here. A list row is a title and its audit trail — no pay
 *   at all — and `PATCH` takes the name alone.
 * - The **wage structure** behind it is effective-dated and lives in
 *   `designation-wage-api.ts`. The one exception is create: `POST` establishes
 *   the title and its opening version together, which is why the create form
 *   submits the whole screen in one call.
 *
 * Reads take a required `company_id` and a create carries it in the body, both
 * taken from the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * The tenant scope plus `search` / `sort` / `sort_by` as the endpoint spells
 * them. Order is always sent — left off, the server's own default decides it,
 * and a list whose order isn't pinned can repeat or skip rows as the user pages.
 */
function queryParams(params: PageParams) {
  return {
    company_id: activeCompanyId('designations'),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? DESIGNATION_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (DESIGNATION_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/designations — one page of the company's designations, in the
 * requested order (newest first unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 */
export async function fetchDesignations(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<Designation>> {
  try {
    const query = queryParams(params)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.DESIGNATIONS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = designationsResponseSchema.parse(raw)
      return { items: items.map(toDesignation), total }
    }

    const collected: Designation[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.DESIGNATIONS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = designationsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toDesignation))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load designations.")
  }
}

/**
 * GET /user/designations/:id — the title plus the wage structure in force and
 * the heads it was saved with, flattened into one record for the edit screen.
 */
export async function fetchDesignation(id: number): Promise<Designation> {
  try {
    const raw = await http.get<unknown>(endpoints.DESIGNATIONS.GET(id))
    return toDesignationDetail(designationDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Designation not found')
  }
}

/**
 * POST /user/designations — the title, its opening wage structure and the heads
 * attached to it, in one call. The response carries the created structure too,
 * but only the title's own columns are read back: the wage tab loads the version
 * history from its own endpoint.
 */
export async function createDesignation(
  values: DesignationFormValues,
): Promise<Designation> {
  try {
    const raw = await http.post<unknown, DesignationPayload>(
      endpoints.DESIGNATIONS.POST,
      {
        company_id: activeCompanyId('designations'),
        ...designationToPayload(values),
      },
    )
    return toDesignation(designationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the designation.")
  }
}

/**
 * PATCH /user/designations/:id — the Basic Info tab, which owns the designation
 * name and nothing else. Pay is never edited in place: a revision is a new wage
 * structure version, added through `createDesignationWageStructure`.
 */
export async function updateDesignationName(
  id: number,
  name: string,
): Promise<Designation> {
  try {
    const raw = await http.patch<unknown, DesignationUpdatePayload>(
      endpoints.DESIGNATIONS.PATCH(id),
      designationNameToPayload(name),
    )
    return toDesignation(designationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the designation.")
  }
}

/**
 * DELETE /user/designations/:id — soft-deletes the designation: it stops
 * appearing in the list and the dropdowns, while its wage-structure versions are
 * left as they are, so nothing about past pay is rewritten.
 */
export async function deleteDesignation(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.DESIGNATIONS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the designation.")
  }
}
