import { useCallback, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useMonitoringPeople } from '../api/use-monitoring-people'
import { useMonitoringChatCounts, useMonitoringChats } from '../api/use-monitoring-chats'
import { useMonitoringMessages } from '../api/use-monitoring-messages'
import { PEOPLE_SEGMENTS, type ChatTab, type PeopleSegment } from '../constants'
import type { MonitoringChat, MonitoringPerson } from '../types'

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
 */
export function useTalkMonitoring() {
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
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)

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
    // The open chat belonged to whoever was selected before.
    setSelectedChat(null)
    setChatTab('all')
    setChatSearch('')
  }, [])

  const selectChat = useCallback((chat: MonitoringChat) => {
    setSelectedChat(chat)
  }, [])

  /** The back arrow on a narrow screen, where only one pane is visible at a time. */
  const clearChat = useCallback(() => {
    setSelectedChat(null)
  }, [])

  const clearPerson = useCallback(() => {
    setSelectedPersonId(null)
    setSelectedPerson(null)
    setSelectedChat(null)
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
