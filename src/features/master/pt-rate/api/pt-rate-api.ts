import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { ensureStates } from '@/features/master/state'
import { ptRateResponseSchema, ptRatesResponseSchema } from '../schemas'
import { ptRateToPayload, sortByEffectiveDateDesc, toPtRate } from '../lib/pt-rate-mappers'
import type { PtRateFormValues, PtRatePayload } from '../schemas'
import type { PtRate } from '../types'

/**
 * PT rates — `/user/pt-rates`. The endpoint is offset-paginated
 * (`?limit=&offset=`, limit capped at 100) and answers `{ items, total }`,
 * which is exactly the shape the list screen pages in.
 *
 * Salary slabs are part of the rate, not a resource of their own: they come back
 * in `details` on every read and are written back in `details` on POST/PATCH, so
 * one save creates, updates and drops slabs in a single call.
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
 * GET /user/pt-rates — one page of rates with their slabs, newest effective
 * date first.
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered. `search` is
 * matched server-side against the detail and the effective date.
 */
export async function fetchPtRates(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<PtRate>> {
  try {
    const names = await stateNamesById()
    const search = params.search?.trim() ? { search: params.search.trim() } : {}

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.PT_RATES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...search,
        },
      })
      const { items, total } = ptRatesResponseSchema.parse(raw)
      return {
        items: sortByEffectiveDateDesc(
          items.map((item) => toPtRate(item, names.get(item.state_id ?? 0))),
        ),
        total,
      }
    }

    const rates: PtRate[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.PT_RATES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...search,
        },
      })
      const parsed = ptRatesResponseSchema.parse(raw)
      total = parsed.total
      rates.push(
        ...parsed.items.map((item) => toPtRate(item, names.get(item.state_id ?? 0))),
      )
      if (parsed.items.length === 0 || rates.length >= total) break
    }

    return { items: sortByEffectiveDateDesc(rates), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load PT rates.")
  }
}

/** GET /user/pt-rates/:id — one rate with its slabs, for the edit form. */
export async function fetchPtRate(id: number): Promise<PtRate> {
  try {
    const raw = await http.get<unknown>(endpoints.PT_RATES.GET(id))
    const response = ptRateResponseSchema.parse(raw)
    const names = await stateNamesById()
    return toPtRate(response, names.get(response.state_id ?? 0))
  } catch (error) {
    throw toApiError(error, 'PT rate not found')
  }
}

/** POST /user/pt-rates — add a rate and its slabs, effective from its W.E.F date. */
export async function createPtRate(values: PtRateFormValues): Promise<PtRate> {
  try {
    const raw = await http.post<unknown, PtRatePayload>(
      endpoints.PT_RATES.POST,
      ptRateToPayload(values),
    )
    return toPtRate(ptRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the PT rate.")
  }
}

/**
 * PATCH /user/pt-rates/:id — the endpoint accepts a partial body, but the form
 * always submits every field, so we send the full rate. `details` carries the
 * slab set as it stands on the form, which is what replaces the stored slabs —
 * a row the user removed is simply absent from it.
 */
export async function updatePtRate(
  id: number,
  values: PtRateFormValues,
): Promise<PtRate> {
  try {
    const raw = await http.patch<unknown, PtRatePayload>(
      endpoints.PT_RATES.PATCH(id),
      ptRateToPayload(values),
    )
    return toPtRate(ptRateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the PT rate.")
  }
}

/** DELETE /user/pt-rates/:id — removes the rate along with its slabs. */
export async function deletePtRate(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.PT_RATES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the PT rate.")
  }
}
