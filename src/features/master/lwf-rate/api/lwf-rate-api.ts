import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { ensureStates } from '@/features/master/state'
import { lwfRateResponseSchema, lwfRatesResponseSchema } from '../schemas'
import {
  lwfRateToPayload,
  sortByEffectiveDateDesc,
  toLwfRate,
} from '../lib/lwf-rate-mappers'
import type { LwfRateFormValues, LwfRatePayload } from '../schemas'
import type { LwfRate } from '../types'

/**
 * LWF rates — `/user/lwf-rates`. The endpoint is offset-paginated
 * (`?limit=&offset=`, limit capped at 100) and answers `{ items, total }`,
 * which is exactly the shape the list screen pages in.
 *
 * A rate references its state by id only, so every read joins in the state
 * master to fill the `stateName` the list rows and history header display.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * State id → name, for denormalising `state_id` onto a rate.
 *
 * A failed state lookup shouldn't take the rate list down with it — the rates
 * are the screen's subject, and an unresolved state just renders as a dash — so
 * this degrades to an empty map instead of throwing.
 */
async function stateNamesById(): Promise<Map<number, string>> {
  try {
    const states = await ensureStates()
    return new Map(states.map((state) => [state.id, state.stateName]))
  } catch {
    return new Map()
  }
}

/**
 * GET /user/lwf-rates — one page of rates, newest effective date first.
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a
 * request at 100, so that case walks the pages until `total` is covered. The
 * endpoint has no search parameter, so `params.search` is ignored.
 */
export async function fetchLwfRates(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<LwfRate>> {
  try {
    const names = await stateNamesById()

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.LWF_RATES.LIST, {
        params: { limit: Math.min(params.limit, MAX_LIMIT), offset: params.offset },
      })
      const { items, total } = lwfRatesResponseSchema.parse(raw)
      return {
        items: sortByEffectiveDateDesc(
          items.map((item) => toLwfRate(item, names.get(item.state_id ?? 0))),
        ),
        total,
      }
    }

    const rates: LwfRate[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.LWF_RATES.LIST, {
        params: { limit: MAX_LIMIT, offset: params.offset + page * MAX_LIMIT },
      })
      const parsed = lwfRatesResponseSchema.parse(raw)
      total = parsed.total
      rates.push(
        ...parsed.items.map((item) => toLwfRate(item, names.get(item.state_id ?? 0))),
      )
      if (parsed.items.length === 0 || rates.length >= total) break
    }

    return { items: sortByEffectiveDateDesc(rates), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load LWF rates.")
  }
}

/** GET /user/lwf-rates/:id — one rate, for the edit form. */
export async function fetchLwfRate(id: number): Promise<LwfRate> {
  try {
    const raw = await http.get<unknown>(endpoints.LWF_RATES.GET(id))
    const response = lwfRateResponseSchema.parse(raw)
    const names = await stateNamesById()
    return toLwfRate(response, names.get(response.state_id ?? 0))
  } catch (error) {
    throw toApiError(error, 'LWF rate not found')
  }
}

/** POST /user/lwf-rates — add a rate effective from its W.E.F date. */
export async function createLwfRate(values: LwfRateFormValues): Promise<LwfRate> {
  try {
    const raw = await http.post<unknown, LwfRatePayload>(
      endpoints.LWF_RATES.POST,
      lwfRateToPayload(values),
    )
    return toLwfRate(lwfRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the LWF rate.")
  }
}

/**
 * PATCH /user/lwf-rates/:id — the endpoint accepts a partial body, but the form
 * always submits every field, so we send the full rate.
 */
export async function updateLwfRate(
  id: number,
  values: LwfRateFormValues,
): Promise<LwfRate> {
  try {
    const raw = await http.patch<unknown, LwfRatePayload>(
      endpoints.LWF_RATES.PATCH(id),
      lwfRateToPayload(values),
    )
    return toLwfRate(lwfRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the LWF rate.")
  }
}

/** DELETE /user/lwf-rates/:id */
export async function deleteLwfRate(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.LWF_RATES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the LWF rate.")
  }
}
