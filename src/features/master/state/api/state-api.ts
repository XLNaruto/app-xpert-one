import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { LOOKUP_STALE_TIME } from '@/lib/lookup-cache'
import type { PageParams, Paginated } from '@/lib/pagination'
import { stateResponseSchema, statesResponseSchema } from '../schemas'
import type { StateRecord } from '../types'

/**
 * State lookup source — `/user/states`. States are maintained by the super
 * admin, so this module is read-only: it only feeds the state dropdowns in
 * other masters and resolves `state_id` to a name for their list rows.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 5

/** API record → the UI record. */
function toStateRecord(item: {
  id: number
  name: string
  code: string | null
  created_at: string
}): StateRecord {
  return {
    id: item.id,
    stateName: item.name,
    code: item.code,
    createdAt: item.created_at,
  }
}

/**
 * GET /user/states — one page of states, matching `search`.
 *
 * This is what backs the scroll-lazy state dropdowns: they start with a single
 * page and ask for the next one as the list is scrolled, so opening a form never
 * pulls the whole master.
 */
export async function fetchStatePage(
  params: PageParams,
): Promise<Paginated<StateRecord>> {
  try {
    const raw = await http.get<unknown>(endpoints.STATES.LIST, {
      params: {
        limit: Math.min(params.limit, MAX_LIMIT),
        offset: params.offset,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    })
    const { items, total } = statesResponseSchema.parse(raw)
    return { items: items.map(toStateRecord), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load states.")
  }
}

/**
 * GET /user/states — the whole state master, sorted by name.
 *
 * For the id → name lookups the list screens need, not for dropdowns — those use
 * `fetchStatePage`. The API caps a request at 100, so this walks the pages until
 * `total` is covered.
 */
export async function fetchStates(): Promise<StateRecord[]> {
  try {
    const states: StateRecord[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.STATES.LIST, {
        params: { limit: MAX_LIMIT, offset: page * MAX_LIMIT },
      })
      const parsed = statesResponseSchema.parse(raw)
      total = parsed.total
      states.push(...parsed.items.map(toStateRecord))
      if (parsed.items.length === 0 || states.length >= total) break
    }

    return states.sort((a, b) => a.stateName.localeCompare(b.stateName))
  } catch (error) {
    throw toApiError(error, "Couldn't load states.")
  }
}

/**
 * The state master, from the query cache when it's already there.
 *
 * What a list screen's `state_id` → name resolution should call: the master is
 * the same for every screen and barely changes, so it's fetched once per session
 * instead of on each page load.
 */
export function ensureStates(): Promise<StateRecord[]> {
  return queryClient.ensureQueryData({
    queryKey: queryKeys.state.list(),
    queryFn: fetchStates,
    staleTime: LOOKUP_STALE_TIME,
  })
}

/**
 * GET /user/states/:id — one state.
 *
 * For labelling a dropdown selection the loaded pages don't reach: an edit form
 * holds a `state_id` from the record, and the row carrying its name may be
 * several pages down the master. One request beats paging until it shows up.
 */
export async function fetchState(id: number): Promise<StateRecord> {
  try {
    const raw = await http.get<unknown>(endpoints.STATES.GET(id))
    return toStateRecord(stateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'State not found')
  }
}
