import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchBonusEstimate, fetchSavedBonuses } from './bonus-estimation-api'
import type { BonusEstimateFilters, SavedBonusFilters } from '../schemas'

/**
 * The estimate over a range. `null` filters mean nothing has been asked for yet —
 * the screen stages its range behind Load, because this is an aggregation over
 * every processed month of every employee in scope and a half-changed range would
 * fire a read nobody asked for.
 *
 * The calculation base is deliberately not part of this: all four come back on
 * every line, so switching it re-fills the column from what is already cached.
 *
 * `keepPreviousData` holds the current page up while the next one loads, which
 * matters more here than on an ordinary list — the rows carry amounts being
 * keyed, and collapsing to skeletons between pages would hide them mid-entry.
 */
export function useBonusEstimate(
  filters: BonusEstimateFilters | null,
  params: PageParams,
) {
  return useQuery({
    queryKey: queryKeys.bonusEstimation.estimate({ ...filters }, params),
    queryFn: () => fetchBonusEstimate(filters!, params),
    enabled: filters !== null,
    placeholderData: keepPreviousData,
  })
}

/** The committed bonuses for the range — the other side of the same screen. */
export function useSavedBonuses(filters: SavedBonusFilters | null, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.bonusEstimation.saved({ ...filters }, params),
    queryFn: () => fetchSavedBonuses(filters!, params),
    enabled: filters !== null,
    placeholderData: keepPreviousData,
  })
}
