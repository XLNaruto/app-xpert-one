import type { ChatType } from './schemas'
import type { PersonKind } from './types'

/**
 * The screen's fixed vocabulary — the two sets of tabs, and the page sizes each
 * pane reads in.
 */

/* ── Paging ────────────────────────────────────────────────────────────────── */

/**
 * The API's maximum `limit`, shared by all three reads (`maximum: 100` on every
 * one of them) — and the batch size the people pane walks the directory in.
 *
 * No page size below may exceed it: the endpoint rejects a larger one rather
 * than clamping it.
 */
export const MONITORING_MAX_LIMIT = 100

/**
 * Stop the directory walk after this many batches, so a wrong `total` can't spin
 * forever. Twenty batches is 2,000 Talk identities — well past any real account,
 * and the pane says so when it truncates.
 */
export const MONITORING_MAX_PAGES = 20

/** Conversations per request in the middle pane — one comfortable scroll-full. */
export const CHAT_PAGE_SIZE = 20

/**
 * Messages per request in the thread — the endpoint's ceiling, not a comfortable
 * screenful.
 *
 * The window is taken from the NEWEST end, so the first page is the latest
 * exchange and each further page walks UP through history. Reading back through
 * a long conversation is the normal way this screen is used, and every page is
 * one round trip the reader waits at the top of the thread for — so the pages
 * are as large as the API allows. The cost that would normally argue for
 * smaller pages, a DOM growing without limit, is gone: the thread is
 * virtualized, so only the visible bubbles are ever mounted.
 */
export const MESSAGE_PAGE_SIZE = MONITORING_MAX_LIMIT

/* ── The people pane's segments ────────────────────────────────────────────── */

/**
 * How the directory is cut up — by which ARM of the product issued the identity,
 * and nothing else.
 *
 * These are CLIENT-side segments, and deliberately so: the endpoint filters on
 * `search` alone, offering nothing for `is_employee`. Filtering a server-paged
 * list in the client would be wrong — a match on page three would stay hidden
 * until the user scrolled to it — so the pane loads the whole matched set
 * instead (see `fetchMonitoringPeople`) and every segment, and every count
 * beside it, is honest across all of it.
 *
 * There is no segment for SUSPENDED credentials. A suspended person is still an
 * employee or an admin, so such a tab would have overlapped both and left the
 * three counts unable to sum to `All`. The state is still visible — every
 * suspended row carries its own badge — it just isn't a way of slicing the list.
 */
export type PeopleSegment = 'all' | 'employee' | 'admin'

export const PEOPLE_SEGMENTS: readonly { value: PeopleSegment; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'employee', label: 'Employees' },
  { value: 'admin', label: 'Admins' },
] as const

/** The badge a person's row carries, by which arm of the product issued them. */
export const PERSON_KIND_LABEL: Record<PersonKind, string> = {
  employee: 'Employee',
  admin: 'Admin',
}

/* ── The conversations pane's tabs ─────────────────────────────────────────── */

/**
 * The middle pane's tabs. `undefined` is the All tab — the endpoint answers it
 * by omitting `type` altogether, newest first.
 *
 * Each tab is its own request rather than one request the client splits, because
 * `total` is what the tab's badge counts and only a filtered call can report it.
 */
export type ChatTab = 'all' | ChatType

export const CHAT_TABS: readonly { value: ChatTab; label: string }[] = [
  { value: 'all', label: 'All' },
  /** The product calls a one-to-one chat `direct`; the screen calls it Private. */
  { value: 'direct', label: 'Private' },
  { value: 'group', label: 'Groups' },
] as const

/** The `type` a tab sends. The All tab sends nothing. */
export function chatTabType(tab: ChatTab): ChatType | undefined {
  return tab === 'all' ? undefined : tab
}
