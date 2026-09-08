import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useMonitoringPeople } from '../api/use-monitoring-people'
import { useMonitoringChatCounts, useMonitoringChats } from '../api/use-monitoring-chats'
import { useMonitoringMessages } from '../api/use-monitoring-messages'
import { PEOPLE_SEGMENTS, type ChatTab, type PeopleSegment } from '../constants'
import type { MonitoringChat, MonitoringPerson } from '../types'

/**
 * The selection as the URL carries it — ids, not records.
 *
 * Only ids can travel: a `?data=` token is for addressing a screen, not for
 * shipping two API rows through the address bar, and a stale copy of a renamed
 * group would be worse than a lookup.
 */
export interface MonitoringSelection {
  personId?: number
  chatId?: number
}

/**
 * The whole screen's state — three panes that each narrow the next.
 *
 * Selection cascades one way only: picking a different person drops the chat
 * that was open (it belongs to the previous person, and the endpoint would 404
 * on the pair anyway) and clears the searches below it, because a term typed
 * against one person's conversations means nothing against another's. Picking a
 * different chat clears only the message search.
 *
 * The page and its components lay out markup against what this returns; none of
 * them holds state of its own.
 *
 * `initial` is the selection read back off the URL — the ids alone, decrypted by
 * the page (a hook never decrypts a token). Restoring from them is not the same
 * as making the selection: a click hands over the whole RECORD, while a refresh
 * has two numbers and has to find the records again. See `restore` below.
 */
export function useTalkMonitoring(initial?: MonitoringSelection) {
  /**
   * Opening a thread is gated a second time on `talk-monitoring:read` — the
   * subscription sells reading conversations separately from listing who has
   * them. The route guard already allowed the screen; this decides whether the
   * third pane offers to open anything, so an unentitled account meets a
   * locked panel instead of a 403 from a click.
   */
  const { canView: canReadThreads } = useResourceAccess(PERMISSIONS.talkMonitoring)

  /* ── Pane 1 · the directory ──────────────────────────────────────────────── */

  const [personSearch, setPersonSearch] = useState('')
  const [segment, setSegment] = useState<PeopleSegment>('all')
  // Seeded from the URL, so the conversations pane starts loading on the first
  // render of a refresh rather than after the directory has been searched.
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
    initial?.personId ?? null,
  )

  // The term reaches the API, so it's debounced — one request per pause, not
  // per keystroke.
  const debouncedPersonSearch = useDebouncedValue(personSearch, 300)

  // Already narrowed by the SERVER to the people whose name matches.
  const peopleQuery = useMonitoringPeople(debouncedPersonSearch)
  const matched = useMemo(() => peopleQuery.data?.items ?? [], [peopleQuery.data])

  /*
    The segments are the one thing left to the client, because the endpoint has
    no filter for `is_employee` or `status`. They cut up the MATCHED set, so each
    count reads as "of the people this search found, how many are admins" — which
    is what a count beside a search box should say.
  */
  const segmentCounts = useMemo(() => countBySegment(matched), [matched])

  const people = useMemo(
    () => matched.filter((person) => matchesSegment(person, segment)),
    [matched, segment],
  )

  /*
    Held as a RECORD, not looked up in the current matches: the list is now the
    server's answer to a search term, so the person being read would vanish from
    it the moment someone typed anything — taking the two panes beside them with
    it. The selection outlives the search that found it.
  */
  const [selectedPerson, setSelectedPerson] = useState<MonitoringPerson | null>(null)

  /* ── Pane 2 · their conversations ────────────────────────────────────────── */

  const [chatTab, setChatTab] = useState<ChatTab>('all')
  const [chatSearch, setChatSearch] = useState('')
  const [selectedChat, setSelectedChat] = useState<MonitoringChat | null>(null)

  // These two DO reach the API, so they're debounced — one request per pause,
  // not per keystroke.
  const debouncedChatSearch = useDebouncedValue(chatSearch, 300)

  const chatsQuery = useMonitoringChats(selectedPersonId, chatTab, debouncedChatSearch)
  const chatCounts = useMonitoringChatCounts(selectedPersonId, debouncedChatSearch)

  const chats = useMemo(
    () => chatsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [chatsQuery.data],
  )

  /**
   * The chat the URL named, until its row has been found.
   *
   * A refresh knows the id and nothing else, and the pane's header draws the
   * conversation's title, picture and member count — so the ROW has to be found
   * before the thread can open. There is no read-one-chat endpoint, so it is
   * looked for in the list, a page at a time, the way the reader would have
   * found it themselves.
   */
  const [pendingChatId, setPendingChatId] = useState<number | null>(
    initial?.chatId ?? null,
  )

  /* ── Restoring what the URL named ────────────────────────────────────────── */

  /**
   * Find the person's record behind the id in the URL.
   *
   * The directory read is the whole matched set (see `useMonitoringPeople`), so
   * with no term typed this is the entire account and the person is either in it
   * or gone — a revoked credential, or one moved out of the account. Gone clears
   * the whole selection rather than leaving two panes loading against an id
   * nothing will answer for.
   */
  useEffect(() => {
    if (selectedPersonId == null || selectedPerson) return
    const found = matched.find((person) => person.talkUserId === selectedPersonId)
    if (found) {
      setSelectedPerson(found)
      return
    }
    if (peopleQuery.isSuccess && !peopleQuery.isFetching) {
      setSelectedPersonId(null)
      setPendingChatId(null)
    }
  }, [
    matched,
    peopleQuery.isFetching,
    peopleQuery.isSuccess,
    selectedPerson,
    selectedPersonId,
  ])

  /**
   * Find the conversation's row behind the id in the URL, walking the list as
   * far as it goes.
   *
   * Conversations come back newest-first, so a chat somebody was reading is
   * usually on the first page and this settles at once. It gives up when the
   * list is exhausted — the chat was cleared, or the person was removed from it
   * — and leaves the reader on the conversations pane rather than on an empty
   * thread.
   */
  useEffect(() => {
    if (pendingChatId == null || selectedChat) return
    const found = chats.find((chat) => chat.id === pendingChatId)
    if (found) {
      setSelectedChat(found)
      setPendingChatId(null)
      return
    }
    if (chatsQuery.isFetching) return
    if (chatsQuery.hasNextPage) {
      void chatsQuery.fetchNextPage()
      return
    }
    if (chatsQuery.isSuccess) setPendingChatId(null)
  }, [chats, chatsQuery, pendingChatId, selectedChat])

  /* ── Pane 3 · the thread ─────────────────────────────────────────────────── */

  const messagesQuery = useMonitoringMessages(
    canReadThreads ? selectedPersonId : null,
    canReadThreads ? (selectedChat?.id ?? null) : null,
  )

  /**
   * Oldest at the top, newest at the bottom.
   *
   * Each page is already oldest-first within itself, but page 1 is OLDER than
   * page 0 — the window is taken from the newest end — so the pages themselves
   * reverse while their contents don't.
   */
  const messages = useMemo(
    () => [...(messagesQuery.data?.pages ?? [])].reverse().flatMap((page) => page.items),
    [messagesQuery.data],
  )

  /* ── Selection ───────────────────────────────────────────────────────────── */

  const selectPerson = useCallback((person: MonitoringPerson) => {
    setSelectedPersonId(person.talkUserId)
    setSelectedPerson(person)
    // The open chat belonged to whoever was selected before — and so did any
    // chat the URL was still looking for.
    setSelectedChat(null)
    setPendingChatId(null)
    setChatTab('all')
    setChatSearch('')
  }, [])

  const selectChat = useCallback((chat: MonitoringChat) => {
    setSelectedChat(chat)
    setPendingChatId(null)
  }, [])

  /** The back arrow on a narrow screen, where only one pane is visible at a time. */
  const clearChat = useCallback(() => {
    setSelectedChat(null)
    setPendingChatId(null)
  }, [])

  const clearPerson = useCallback(() => {
    setSelectedPersonId(null)
    setSelectedPerson(null)
    setSelectedChat(null)
    setPendingChatId(null)
  }, [])

  return {
    canReadThreads,

    // Pane 1
    peopleQuery,
    people,
    /** Rows the SEARCH matched, before the segment narrowed them further. */
    totalPeople: matched.length,
    /** True when the account has more identities than the walk would read. */
    peopleTruncated: peopleQuery.data?.truncated ?? false,
    personSearch,
    setPersonSearch,
    segment,
    setSegment,
    segmentCounts,
    selectedPerson,
    selectPerson,
    clearPerson,

    // Pane 2
    chatsQuery,
    chats,
    chatTab,
    setChatTab,
    chatCounts,
    chatSearch,
    setChatSearch,
    selectedChat,
    selectChat,
    clearChat,
    /**
     * True while a selection named in the URL is still being resolved — the
     * panes show their loading state rather than "nothing selected", which on a
     * refresh would flash the intro over a screen that is about to fill.
     */
    restoring: Boolean(
      (selectedPersonId != null && !selectedPerson) || pendingChatId != null,
    ),

    // Pane 3
    messagesQuery,
    messages,
  }
}

/**
 * A segment is a question about one person, asked in one place so the filter and
 * the badge beside it can never disagree.
 *
 * Both segments read `kind`, which is the API's `is_employee`: a workforce
 * credential, or a back-office login. Nothing here looks at `status` — a
 * suspended person still belongs to whichever arm issued them, and the row says
 * so with its own badge.
 */
function matchesSegment(person: MonitoringPerson, segment: PeopleSegment): boolean {
  switch (segment) {
    case 'employee':
      return person.kind === 'employee'
    case 'admin':
      return person.kind === 'admin'
    default:
      return true
  }
}

function countBySegment(people: MonitoringPerson[]): Record<PeopleSegment, number> {
  return PEOPLE_SEGMENTS.reduce<Record<PeopleSegment, number>>(
    (counts, { value }) => {
      counts[value] = people.filter((person) => matchesSegment(person, value)).length
      return counts
    },
    {} as Record<PeopleSegment, number>,
  )
}
