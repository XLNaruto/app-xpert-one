import { useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { MESSAGE_PAGE_SIZE } from '../constants'
import { fetchMonitoringMessages } from './talk-monitoring-api'

/**
 * GET …/chats/:chatId/messages — one conversation, read backwards.
 *
 * The endpoint takes its window from the NEWEST end, so page 0 is the latest
 * exchange and each further page is OLDER. That inverts the usual infinite list:
 * the thread renders `pages` reversed, and fetching the next page prepends
 * history above what is already on screen rather than appending below it.
 *
 * `enabled` needs BOTH ids: the endpoint enforces the pairing (404 if the chat
 * isn't one this person is in), which is what stops the middle pane from being
 * decoration.
 */
export function useMonitoringMessages(talkUserId: number | null, chatId: number | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.talkMonitoring.messages(talkUserId ?? 0, chatId ?? 0),
    queryFn: ({ pageParam }) =>
      fetchMonitoringMessages(talkUserId as number, chatId as number, {
        limit: MESSAGE_PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0)
      return loaded < lastPage.total ? loaded : undefined
    },
    enabled: talkUserId != null && chatId != null,
  })
}
