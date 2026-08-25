import { useInfiniteQuery, useQueries } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { CHAT_PAGE_SIZE, CHAT_TABS, chatTabType, type ChatTab } from '../constants'
import { fetchMonitoringChats } from './talk-monitoring-api'

/**
 * GET /user/talk/monitoring/people/:talkUserId/chats — the selected person's
 * conversations, scrolled rather than paged.
 *
 * `offset` is the page param, so the next request starts where the loaded rows
 * end. `tab` and `search` are both sent to the API, which is why the key carries
 * them: a different tab is a different result set with its own `total`, not a
 * client-side slice of one list.
 *
 * Disabled until a person is picked — the first pane's selection is what makes
 * this request addressable at all.
 */
export function useMonitoringChats(
  talkUserId: number | null,
  tab: ChatTab,
  search?: string,
) {
  const type = chatTabType(tab)

  return useInfiniteQuery({
    queryKey: queryKeys.talkMonitoring.chats(talkUserId ?? 0, type, search),
    queryFn: ({ pageParam }) =>
      fetchMonitoringChats(talkUserId as number, {
        limit: CHAT_PAGE_SIZE,
        offset: pageParam,
        type,
        search,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0)
      // `undefined` is how TanStack Query is told there's no next page.
      return loaded < lastPage.total ? loaded : undefined
    },
    enabled: talkUserId != null,
  })
}

/**
 * The number beside each tab.
 *
 * All three badges are on screen at once while only one tab's rows are, so the
 * counts can't come from the list query alone. Each is its own `limit: 1` read —
 * the cheapest way to ask the endpoint for a `total`, and the only way to have
 * one at all for a tab that isn't open, since `total` is per-`type` by design.
 *
 * That is three requests per person picked, and the price of showing what each
 * tab holds before it is opened. `limit: 1` keeps each one to a single row, and
 * they cache per person and per term like any other query — so switching back to
 * someone already looked at costs nothing.
 *
 * The counts follow `search`: with a term typed, a badge should count what that
 * tab matches, not what it holds.
 */
export function useMonitoringChatCounts(talkUserId: number | null, search?: string) {
  const results = useQueries({
    queries: CHAT_TABS.map(({ value }) => {
      const type = chatTabType(value)
      return {
        queryKey: queryKeys.talkMonitoring.chatCount(talkUserId ?? 0, value, search),
        queryFn: () =>
          fetchMonitoringChats(talkUserId as number, {
            limit: 1,
            offset: 0,
            type,
            search,
          }),
        enabled: talkUserId != null,
        staleTime: 60 * 1000,
      }
    }),
  })

  return CHAT_TABS.reduce<Record<ChatTab, number | undefined>>(
    (counts, { value }, index) => {
      counts[value] = results[index]?.data?.total
      return counts
    },
    {} as Record<ChatTab, number | undefined>,
  )
}
