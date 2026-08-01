import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { LOOKUP_STALE_TIME } from '@/lib/lookup-cache'
import type { PageParams, Paginated } from '@/lib/pagination'
import { fetchStates } from '@/features/master/state'
import { districtsResponseSchema } from '../schemas'
import type { DistrictRecord } from '../types'

/**
 * District lookup source — `/user/districts`. Districts are maintained by the
 * super admin, so this module is read-only: it feeds the district dropdowns in
 * other masters and resolves `district_id` to a name for their list rows.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/**
 * Stop after this many batches so a bad `total` can't spin forever. India has
 * ~800 districts, so 12 pages covers the unfiltered master with room to spare.
 */
const MAX_PAGES = 12

/**
 * GET /user/districts — one page of districts, matching `search` and narrowed to
 * `stateId` server-side.
 *
 * This is what backs the scroll-lazy district dropdowns: they start with a single
 * page and ask for the next one as the list is scrolled. The parent state's name
 * isn't joined in here — a cascade already knows which state it's under.
 */
export async function fetchDistrictPage(
  params: PageParams & { stateId?: number },
): Promise<Paginated<DistrictRecord>> {
  try {
    const raw = await http.get<unknown>(endpoints.DISTRICTS.LIST, {
      params: {
        limit: Math.min(params.limit, MAX_LIMIT),
        offset: params.offset,
        ...(params.stateId ? { state_id: params.stateId } : {}),
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    })
    const { items, total } = districtsResponseSchema.parse(raw)
    return {
      items: items.map((item) => ({
        id: item.id,
        stateId: item.state_id,
        state: '',
        districtName: item.name,
        createdAt: item.created_at,
      })),
      total,
    }
  } catch (error) {
    throw toApiError(error, "Couldn't load districts.")
  }
}

/**
 * GET /user/districts — districts, sorted by name.
 *
 * For the id → name lookups the list screens need, not for dropdowns — those use
 * `fetchDistrictPage`. Pass `stateId` to let the API narrow them server-side;
 * omitted, this walks every page of the master.
 */
export async function fetchDistricts(stateId?: number): Promise<DistrictRecord[]> {
  try {
    // The record carries its parent state's name for the screens that still
    // match on the name rather than the id.
    const states = await fetchStates().catch(() => [])
    const stateNames = new Map(states.map((state) => [state.id, state.stateName]))

    const districts: DistrictRecord[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.DISTRICTS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: page * MAX_LIMIT,
          ...(stateId ? { state_id: stateId } : {}),
        },
      })
      const parsed = districtsResponseSchema.parse(raw)
      total = parsed.total
      districts.push(
        ...parsed.items.map((item) => ({
          id: item.id,
          stateId: item.state_id,
          state: stateNames.get(item.state_id) ?? '',
          districtName: item.name,
          createdAt: item.created_at,
        })),
      )
      if (parsed.items.length === 0 || districts.length >= total) break
    }

    return districts.sort((a, b) => a.districtName.localeCompare(b.districtName))
  } catch (error) {
    throw toApiError(error, "Couldn't load districts.")
  }
}

/**
 * One state's districts, from the query cache when they're already there.
 *
 * What a list screen's `district_id` → name resolution should call: it's the same
 * data the state's dropdown reads and it barely changes, so each state's
 * districts are fetched once per session instead of on each page load.
 */
export function ensureDistricts(stateId?: number): Promise<DistrictRecord[]> {
  return queryClient.ensureQueryData({
    queryKey: queryKeys.district.list(stateId),
    queryFn: () => fetchDistricts(stateId),
    staleTime: LOOKUP_STALE_TIME,
  })
}
