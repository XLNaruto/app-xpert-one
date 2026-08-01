import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { esicRateResponseSchema, esicRatesResponseSchema } from '../schemas'
import {
  esicRateToCreatePayload,
  esicRateToUpdatePayload,
  sortByEffectiveDateDesc,
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
 * which is exactly the shape the list screen pages in.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/esic-rates — one page of slabs, newest effective date first.
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a
 * request at 100, so that case walks the pages until `total` is covered. The
 * endpoint has no search parameter, so `params.search` is ignored.
 */
export async function fetchEsicRates(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<EsicRate>> {
  try {
    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.ESIC_RATES.LIST, {
        params: { limit: Math.min(params.limit, MAX_LIMIT), offset: params.offset },
      })
      const { items, total } = esicRatesResponseSchema.parse(raw)
      return { items: sortByEffectiveDateDesc(items.map(toEsicRate)), total }
    }

    const rates: EsicRate[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.ESIC_RATES.LIST, {
        params: { limit: MAX_LIMIT, offset: params.offset + page * MAX_LIMIT },
      })
      const parsed = esicRatesResponseSchema.parse(raw)
      total = parsed.total
      rates.push(...parsed.items.map(toEsicRate))
      if (parsed.items.length === 0 || rates.length >= total) break
    }

    return { items: sortByEffectiveDateDesc(rates), total }
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
