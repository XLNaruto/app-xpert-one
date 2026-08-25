import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { Paginated } from '@/lib/pagination'
import { MONITORING_MAX_LIMIT, MONITORING_MAX_PAGES } from '../constants'
import {
  monitoringChatsResponseSchema,
  monitoringMessagesResponseSchema,
  monitoringPeopleResponseSchema,
  type ChatType,
} from '../schemas'
import {
  toMonitoringChat,
  toMonitoringMessage,
  toMonitoringPerson,
} from '../lib/talk-monitoring-mappers'
import type { MonitoringChat, MonitoringMessage, MonitoringPerson } from '../types'

/**
 * Talk monitoring — `/user/talk/monitoring/*`. Three reads, one per pane, all
 * offset-paginated (`?limit=&offset=`) answering `{ items, total }`.
 *
 * READ-ONLY by construction: there is no write anywhere in this resource, which
 * is the whole point of a monitoring window. Nothing here invalidates a cache
 * because nothing here changes anything.
 *
 * OWNER ONLY. An admin user is refused with 403 however their role is ticked,
 * and the thread call is gated a second time on `talk-monitoring:read` — opening
 * a conversation is the entitlement the subscription actually sells, so an
 * account that never bought it is refused even for the owner.
 *
 * ACCOUNT-scoped, not tenant-scoped: every company of the account is included
 * with no picker and no filter, because the caller's reach is every company by
 * construction. No call here takes a `company_id`.
 */

/**
 * GET /user/talk/monitoring/people — the directory of Talk identities, in full.
 *
 * SEARCH IS THE SERVER'S. `search` is sent to the endpoint, which matches it
 * against the person's NAME (case-insensitive, partial) across the whole
 * account — so a match is found wherever it sits in the directory, not only in
 * the rows this client happens to be holding. Note the endpoint matches the name
 * ALONE: an email is not searchable, whatever the row shows.
 *
 * The SEGMENTS are still the client's, and have to be. The endpoint offers no
 * filter for `is_employee`, while the pane is cut into All / Employees / Admins
 * with a count on each — so the matched set is read in full, in
 * `MONITORING_MAX_LIMIT` batches, and cut up here. Paging it instead would make
 * every one of those counts describe the loaded window rather than the account.
 *
 * This is the sidebar-panel case, not the data-table case: one row per person
 * rather than per transaction, and `total` says up front how far to walk. A
 * search only narrows it further.
 *
 * The walk stops at `MONITORING_MAX_PAGES` batches whatever `total` claims, so a
 * bad count can't spin forever — `truncated` says when that happened, and the
 * pane tells the user to narrow the search rather than silently showing part of
 * the account.
 */
export async function fetchMonitoringPeople(
  search?: string,
): Promise<Paginated<MonitoringPerson> & { truncated: boolean }> {
  try {
    const term = search?.trim()
    const collected: MonitoringPerson[] = []
    let total = 0
    let truncated = false

    for (let page = 0; page < MONITORING_MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.TALK_MONITORING.PEOPLE, {
        params: {
          limit: MONITORING_MAX_LIMIT,
          offset: page * MONITORING_MAX_LIMIT,
          ...(term ? { search: term } : {}),
        },
      })
      const parsed = monitoringPeopleResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toMonitoringPerson))

      // A short batch means the server has run out, whatever `total` says.
      if (parsed.items.length < MONITORING_MAX_LIMIT) break
      if (collected.length >= total) break
      // The last allowed batch still left rows behind.
      truncated = page === MONITORING_MAX_PAGES - 1
    }

    return { items: collected, total, truncated }
  } catch (error) {
    throw toApiError(error, "Couldn't load the people to monitor.")
  }
}

/**
 * GET /user/talk/monitoring/people/:talkUserId/chats — one page of a person's
 * conversations, newest first.
 *
 * `type` is the pane's tab; omitted, both kinds come back interleaved. `search`
 * matches the chat's TITLE, and the title lives in two places — a group matches
 * on its own name, a direct chat on the OTHER participant's, since it has no
 * name of its own.
 *
 * 404 for a `talkUserId` that isn't this account's.
 */
export async function fetchMonitoringChats(
  talkUserId: number,
  {
    limit,
    offset,
    type,
    search,
  }: { limit: number; offset: number; type?: ChatType; search?: string },
): Promise<Paginated<MonitoringChat>> {
  try {
    const raw = await http.get<unknown>(endpoints.TALK_MONITORING.CHATS(talkUserId), {
      params: {
        limit,
        offset,
        ...(type ? { type } : {}),
        ...(search?.trim() ? { search: search.trim() } : {}),
      },
    })
    const { items, total } = monitoringChatsResponseSchema.parse(raw)
    return { items: items.map(toMonitoringChat), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load this person's conversations.")
  }
}

/**
 * GET /user/talk/monitoring/people/:talkUserId/chats/:chatId/messages — one
 * window of a thread, oldest-first within the window.
 *
 * The window is taken from the NEWEST end: `offset: 0` is the latest exchange
 * and paging walks UP through history, which is why the thread pane renders its
 * pages in reverse and prepends each new one. `total` is the whole thread.
 *
 * The endpoint also accepts a `search` (full-text over the message body), which
 * this deliberately does NOT send: the screen offers no in-conversation search,
 * and a match list is a different thing from a thread — it can't be paged
 * upward and has no beginning to reach. Add the parameter back here if that
 * screen is ever built.
 *
 * BOTH ids are checked and the PAIRING is enforced — the person must be this
 * account's and the chat must be one they are a member of, or the answer is 404.
 * Without that the middle pane would be decoration and any chat of the account
 * could be read through any person. A member who has since LEFT still resolves.
 *
 * What comes back is the conversation AS IT STANDS: messages a participant hid
 * for themselves, or that fall before they cleared the chat, are not filtered
 * out. Only two things are missing, and neither is a policy choice — a message
 * deleted for everyone returns as a tombstone with its text already cleared from
 * the row, and an ordinary soft delete is excluded as everywhere else.
 */
export async function fetchMonitoringMessages(
  talkUserId: number,
  chatId: number,
  { limit, offset }: { limit: number; offset: number },
): Promise<Paginated<MonitoringMessage>> {
  try {
    const raw = await http.get<unknown>(
      endpoints.TALK_MONITORING.MESSAGES(talkUserId, chatId),
      { params: { limit, offset } },
    )
    const { items, total } = monitoringMessagesResponseSchema.parse(raw)
    return { items: items.map(toMonitoringMessage), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load this conversation.")
  }
}
