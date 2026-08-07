import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams, Paginated } from '@/lib/pagination'
import type { WageHeads } from '@/features/master/designation'
import {
  toBulkWageDesignation,
  toBulkWageHistoryDesignation,
} from '../lib/bulk-wage-mappers'
import {
  bulkWageGridResponseSchema,
  bulkWageHistoryResponseSchema,
  type BulkWageUpdatePayload,
} from '../schemas'
import type { BulkWageDesignation, BulkWageHistoryDesignation } from '../types'

/**
 * The bulk wage grid — every designation of one company against one effective
 * month, read and written whole.
 *
 * Both calls answer the same payload, so a save needs no separate refetch to
 * know what was stored: the response *is* the grid as it now stands.
 *
 * A version's `salary_components` come back as ids, and the grid's allowance and
 * deduction columns are the heads of that master — the caller passes the heads
 * in so the mappers can lay each row's values out under the columns.
 */

/**
 * GET /user/designations/wage-structures — the whole grid for `companyId`.
 *
 * Unpaginated, unlike every other list in the app: the screen is saved as a
 * whole, so paging it would mean a save that only covers what's on screen. The
 * endpoint caps the write at 200 rows, which is the practical ceiling here too.
 *
 * The company is the screen's own pick rather than the session's active one —
 * the whole point of the toolbar's company field — so it's passed in.
 */
export async function fetchBulkWageGrid(
  companyId: number,
  heads: WageHeads,
): Promise<BulkWageDesignation[]> {
  try {
    const raw = await http.get<unknown>(endpoints.DESIGNATIONS.BULK_WAGE_GRID, {
      params: { company_id: companyId },
    })
    const { items } = bulkWageGridResponseSchema.parse(raw)
    return items.map((item) => toBulkWageDesignation(item, heads))
  } catch (error) {
    throw toApiError(error, "Couldn't load the wage grid.")
  }
}

/**
 * GET /user/designations/wage-structures/history — the read-only twin of the
 * grid: every designation of `companyId` with every wage version ever saved for
 * it, newest effective month first.
 *
 * Paged, unlike the grid — nothing is written here, so there's no whole-screen
 * save to page around, and one designation can carry years of versions. The
 * paging is over the *designations*, so `total` counts titles rather than
 * versions and a title's history is never split across two pages.
 *
 * The endpoint takes `limit`/`offset` and nothing else: it neither searches nor
 * sorts, so the screen offers neither rather than filtering a page client-side.
 */
export async function fetchBulkWageHistory(
  companyId: number,
  { limit, offset }: PageParams,
  heads: WageHeads,
): Promise<Paginated<BulkWageHistoryDesignation>> {
  try {
    const raw = await http.get<unknown>(endpoints.DESIGNATIONS.BULK_WAGE_HISTORY, {
      params: { company_id: companyId, limit, offset },
    })
    const { items, total } = bulkWageHistoryResponseSchema.parse(raw)
    return {
      items: items.map((item) => toBulkWageHistoryDesignation(item, heads)),
      total,
    }
  } catch (error) {
    throw toApiError(error, "Couldn't load the wage structure history.")
  }
}

/**
 * POST /user/designations/bulk-update — apply one `YYYY-MM` month across the
 * rows sent, in a single transaction: either every row lands or none does.
 *
 * Per row, a wage structure already effective from that exact month is updated
 * and any other month adds a version, the earlier ones kept as history. That's
 * why one endpoint serves both buttons on the screen: a single row's Save sends
 * one row, Save All sends the changed ones.
 *
 * The rows are sent in full, blanks included. `salary_components` replaces a
 * row's heads outright, so a head left out is removed — which is how clearing a
 * cell takes its allowance off the designation.
 */
export async function saveBulkWage(
  payload: BulkWageUpdatePayload,
  heads: WageHeads,
): Promise<BulkWageDesignation[]> {
  try {
    const raw = await http.post<unknown, BulkWageUpdatePayload>(
      endpoints.DESIGNATIONS.BULK_UPDATE,
      payload,
    )
    const { items } = bulkWageGridResponseSchema.parse(raw)
    return items.map((item) => toBulkWageDesignation(item, heads))
  } catch (error) {
    throw toApiError(error, "Couldn't save the wage grid.")
  }
}
