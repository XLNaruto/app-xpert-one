import { useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchStatePage } from './state-api'

/** Rows per request — one comfortable panel-full of the dropdown. */
export const STATE_PAGE_SIZE = 20

/**
 * GET /user/states — paged, for a scroll-lazy dropdown.
 *
 * `offset` is the page param, so the next page starts where the loaded rows end;
 * `search` is sent to the API, which is why it belongs in the query key.
 */
export function useStatesInfinite(search?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.state.infinite(search),
    queryFn: ({ pageParam }) =>
      fetchStatePage({ limit: STATE_PAGE_SIZE, offset: pageParam, search }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0)
      // `undefined` is how TanStack Query is told there's no next page.
      return loaded < lastPage.total ? loaded : undefined
    },
  })
}
