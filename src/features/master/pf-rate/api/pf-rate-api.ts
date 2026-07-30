import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { pfRateResponseSchema, pfRatesResponseSchema } from '../schemas'
import { pfRateToPayload, sortByEffectiveDateDesc, toPfRate } from '../lib/pf-rate-mappers'
import type { PfRateFormValues, PfRatePayload } from '../schemas'
import type { PfRate } from '../types'

/**
 * PF rate slabs — `/user/pf-rates`. The API is offset-paginated at a hard cap of
 * 100 per page while the list screen sorts and pages client-side, so the fetch
 * below walks the pages and hands back the whole master.
 */

/** The API's maximum `limit`. */
const PAGE_SIZE = 100

/** Stop after this many pages so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/pf-rates — every slab, newest effective date first. Pages are
 * fetched until `total` is covered; the master is small enough that this is one
 * request in practice.
 */
export async function fetchPfRates(): Promise<PfRate[]> {
  try {
    const rates: PfRate[] = []

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.PF_RATES.LIST, {
        params: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      })
      const { items, total } = pfRatesResponseSchema.parse(raw)
      rates.push(...items.map(toPfRate))
      if (items.length === 0 || rates.length >= total) break
    }

    return sortByEffectiveDateDesc(rates)
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
