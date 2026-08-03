import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { PF_RATE_DEFAULT_SORT } from '../constants'
import { pfRateResponseSchema, pfRatesResponseSchema } from '../schemas'
import { pfRateToPayload, toPfRate } from '../lib/pf-rate-mappers'
import type { PfRateFormValues, PfRatePayload } from '../schemas'
import type { PfRate } from '../types'

/**
 * PF rate slabs — `/user/pf-rates`. The endpoint is offset-paginated
 * (`?limit=&offset=`, limit capped at 100) and answers `{ items, total }`,
 * which is exactly the shape the list screen pages in. It also searches and
 * sorts server-side, so both span every page rather than the current one.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * `search` / `sort` / `sort_by` as the endpoint spells them. Order is always
 * sent — left off, the server's own default decides it, and a list whose order
 * isn't pinned can repeat or skip rows as the user pages through it.
 */
function queryParams(params: PageParams) {
  return {
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? PF_RATE_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (PF_RATE_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/pf-rates — one page of slabs in the requested order (newest
 * effective date first unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a
 * request at 100, so that case walks the pages until `total` is covered.
 */
export async function fetchPfRates(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<PfRate>> {
  try {
    const query = queryParams(params)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.PF_RATES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = pfRatesResponseSchema.parse(raw)
      return { items: items.map(toPfRate), total }
    }

    const rates: PfRate[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.PF_RATES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = pfRatesResponseSchema.parse(raw)
      total = parsed.total
      rates.push(...parsed.items.map(toPfRate))
      if (parsed.items.length === 0 || rates.length >= total) break
    }

    return { items: rates, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load PF rates.")
  }
}

/** GET /user/pf-rates/:id — one slab, for the edit form. */
export async function fetchPfRate(id: number): Promise<PfRate> {
  try {
    const raw = await http.get<unknown>(endpoints.PF_RATES.GET(id))
    return toPfRate(pfRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'PF rate not found')
  }
}

/** POST /user/pf-rates — add a slab effective from its W.E.F date. */
export async function createPfRate(values: PfRateFormValues): Promise<PfRate> {
  try {
    const raw = await http.post<unknown, PfRatePayload>(
      endpoints.PF_RATES.POST,
      pfRateToPayload(values),
    )
    return toPfRate(pfRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the PF rate.")
  }
}

/**
 * PATCH /user/pf-rates/:id — the endpoint accepts a partial body, but the form
 * always submits every field, so we send the full slab.
 */
export async function updatePfRate(
  id: number,
  values: PfRateFormValues,
): Promise<PfRate> {
  try {
    const raw = await http.patch<unknown, PfRatePayload>(
      endpoints.PF_RATES.PATCH(id),
      pfRateToPayload(values),
    )
    return toPfRate(pfRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the PF rate.")
  }
}

/** DELETE /user/pf-rates/:id */
export async function deletePfRate(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.PF_RATES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the PF rate.")
  }
}
