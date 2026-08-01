import { useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDistrictPage } from './district-api'

/** Rows per request — one comfortable panel-full of the dropdown. */
export const DISTRICT_PAGE_SIZE = 20

/**
 * GET /user/districts — paged, for a scroll-lazy dropdown.
 *
 * Disabled until `stateId` is known: districts cascade off a state, and there's
 * no useful "all districts" list to show before one is chosen.
 */
export function useDistrictsInfinite(stateId?: number, search?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.district.infinite(stateId, search),
    queryFn: ({ pageParam }) =>
      fetchDistrictPage({
        stateId,
        limit: DISTRICT_PAGE_SIZE,
        offset: pageParam,
        search,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0)
      return loaded < lastPage.total ? loaded : undefined
    },
    enabled: stateId != null,
  })
}
