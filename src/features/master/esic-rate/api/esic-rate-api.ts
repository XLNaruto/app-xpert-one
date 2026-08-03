import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { ESIC_RATE_DEFAULT_SORT } from '../constants'
import { esicRateResponseSchema, esicRatesResponseSchema } from '../schemas'
import {
  esicRateToCreatePayload,
  esicRateToUpdatePayload,
  toEsicRate,
} from '../lib/esic-rate-mappers'
import type {
  EsicRateCreatePayload,
  EsicRateFormValues,
  EsicRateUpdatePayload,
} from '../schemas'
import type { EsicRate } from '../types'

/**
 * ESIC rate slabs — `/user/esic-rates`. The endpoint is offset-paginated
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
    sort: params.sort ?? ESIC_RATE_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (ESIC_RATE_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/esic-rates — one page of slabs in the requested order (newest
 * effective date first unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a
 * request at 100, so that case walks the pages until `total` is covered.
 */
export async function fetchEsicRates(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<EsicRate>> {
  try {
    const query = queryParams(params)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.ESIC_RATES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = esicRatesResponseSchema.parse(raw)
      return { items: items.map(toEsicRate), total }
    }

    const rates: EsicRate[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.ESIC_RATES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = esicRatesResponseSchema.parse(raw)
      total = parsed.total
      rates.push(...parsed.items.map(toEsicRate))
      if (parsed.items.length === 0 || rates.length >= total) break
    }

    return { items: rates, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load ESIC rates.")
  }
}

/** GET /user/esic-rates/:id — one slab, for the edit form. */
export async function fetchEsicRate(id: number): Promise<EsicRate> {
  try {
    const raw = await http.get<unknown>(endpoints.ESIC_RATES.GET(id))
    return toEsicRate(esicRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'ESIC rate not found')
  }
}

/** POST /user/esic-rates — add a slab effective from its W.E.F date. */
export async function createEsicRate(
  values: EsicRateFormValues,
): Promise<EsicRate> {
  try {
    const raw = await http.post<unknown, EsicRateCreatePayload>(
      endpoints.ESIC_RATES.POST,
      esicRateToCreatePayload(values),
    )
    return toEsicRate(esicRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the ESIC rate.")
  }
}

/**
 * PATCH /user/esic-rates/:id — the endpoint accepts a partial body, but the
 * form always submits every field, so we send the full slab.
 */
export async function updateEsicRate(
  id: number,
  values: EsicRateFormValues,
): Promise<EsicRate> {
  try {
    const raw = await http.patch<unknown, EsicRateUpdatePayload>(
      endpoints.ESIC_RATES.PATCH(id),
      esicRateToUpdatePayload(values),
    )
    return toEsicRate(esicRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the ESIC rate.")
  }
}

/** DELETE /user/esic-rates/:id */
export async function deleteEsicRate(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.ESIC_RATES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the ESIC rate.")
  }
}
