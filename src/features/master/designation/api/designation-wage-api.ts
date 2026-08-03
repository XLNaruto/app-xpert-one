import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { activeCompanyId } from '@/lib/active-company'
import { byEffectiveMonthDesc } from '../lib/effective-month'
import { toWageStructure, type WageHead } from '../lib/wage-structure-mappers'
import { wageStructureResponseSchema, wageStructuresResponseSchema } from '../schemas'
import type { WageStructureRowPayload } from '../schemas'
import type { DesignationWageStructure } from '../types'

/**
 * A designation's wage structure history — `/user/designations/:id/wage-structures`.
 *
 * The history is versioned rather than mutable: a row applies from its effective
 * month onward until a later row supersedes it. That gives two writes with very
 * different meanings, and the docs are emphatic about the difference:
 *
 * - **POST** inserts ONE new version. The earlier months keep what they were
 *   paid on, so this is what a revision is.
 * - **PATCH** corrects ONE existing version in place. No new version is created —
 *   it rewrites what a past month is read as, so it's for fixing a mistake.
 *
 * A POST starts from the version in force and applies what it's sent on top, and
 * a PATCH leaves an omitted field as stored. Both are sent in full regardless, so
 * a cleared cell reads as cleared rather than inheriting the old value.
 *
 * `salary_components` needs each head's id from the pay-component catalog, while
 * the grid's columns are fixed short codes — the caller passes the catalog in and
 * the mappers resolve the two.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/designations/:id/wage-structures — the whole history, most recent
 * effective month first.
 *
 * The tab renders the history as one list rather than paging it, so this walks
 * the endpoint's pages until `total` is covered. `company_id` is sent as the
 * guard the endpoint offers: a designation belonging to another company 404s
 * rather than reading.
 */
export async function fetchDesignationWageStructures(
  designationId: number,
  heads: WageHead[],
): Promise<DesignationWageStructure[]> {
  try {
    const company_id = activeCompanyId('wage structures')
    const collected: DesignationWageStructure[] = []

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(
        endpoints.DESIGNATIONS.WAGE_STRUCTURES(designationId),
        { params: { company_id, limit: MAX_LIMIT, offset: page * MAX_LIMIT } },
      )
      const { items, total } = wageStructuresResponseSchema.parse(raw)
      collected.push(...items.map((item) => toWageStructure(item, designationId, heads)))
      if (items.length === 0 || collected.length >= total) break
    }

    // The endpoint already orders by effective date, but "newest first" is what
    // the grid's reading depends on — assert it rather than assume it.
    return collected.sort(byEffectiveMonthDesc)
  } catch (error) {
    throw toApiError(error, "Couldn't load the wage structure history.")
  }
}

/**
 * POST /user/designations/:id/wage-structures — append one new version, taking
 * effect from its `YYYY-MM` month. A month that already has a version isn't
 * rejected: the newest row wins wherever the structure in force is read.
 */
export async function createDesignationWageStructure(
  designationId: number,
  payload: Omit<WageStructureRowPayload, 'company_id'>,
  heads: WageHead[],
): Promise<DesignationWageStructure> {
  try {
    const raw = await http.post<unknown, WageStructureRowPayload>(
      endpoints.DESIGNATIONS.WAGE_STRUCTURES(designationId),
      { company_id: activeCompanyId('wage structures'), ...payload },
    )
    return toWageStructure(wageStructureResponseSchema.parse(raw), designationId, heads)
  } catch (error) {
    throw toApiError(error, "Couldn't save the wage structure.")
  }
}

/**
 * PATCH /user/designations/:id/wage-structures/:wageStructureId — correct one
 * stored version in place. `effective_from` moves this row's own month; it does
 * not create a version, so what earlier months are read as changes with it.
 */
export async function updateDesignationWageStructure(
  designationId: number,
  wageStructureId: number,
  payload: Omit<WageStructureRowPayload, 'company_id'>,
  heads: WageHead[],
): Promise<DesignationWageStructure> {
  try {
    const raw = await http.patch<unknown, WageStructureRowPayload>(
      endpoints.DESIGNATIONS.WAGE_STRUCTURE(designationId, wageStructureId),
      { company_id: activeCompanyId('wage structures'), ...payload },
    )
    return toWageStructure(wageStructureResponseSchema.parse(raw), designationId, heads)
  } catch (error) {
    throw toApiError(error, "Couldn't update the wage structure.")
  }
}
