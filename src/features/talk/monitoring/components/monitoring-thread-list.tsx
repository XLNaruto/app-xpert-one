import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { groupMessagesByDay, type ThreadEntry } from '../lib/talk-monitoring-dates'
import { resolveQuoteMedia } from '../lib/talk-monitoring-mappers'
import { toasterrormsg } from '@/lib/toast'
import { MonitoringMessageBubble } from './monitoring-message-bubble'
import type { MonitoringMessage } from '../types'

/**
 * The scrolling body of a conversation, virtualized.
 *
 * A thread is the one list on this screen that grows without a ceiling — the
 * reader pulls another page of history every time they reach the top — and the
 * one whose rows have no fixed height: a bubble may be a line of text, a video,
 * or a quoted reply above three attachments. `<Virtuoso>` is used rather than
 * `useVirtualizer` for exactly that combination, because the two things that
 * make a chat hard are the two things it does natively:
 *
 * - **`firstItemIndex` absorbs the prepend.** Older history arriving above the
 *   viewport would otherwise shove the conversation down mid-read. Virtuoso
 *   keeps a stable index space and holds the reader's position for us.
 * - **Heights are measured, not declared.** Nothing here has to guess how tall
 *   an image bubble will be before its image loads.
 *
 * `startReached` replaces a top sentinel: in a virtualized list the sentinel is
 * unmounted most of the time, so an IntersectionObserver on it would never fire.
 */

/**
 * The high anchor of Virtuoso's index space.
 *
 * Prepending has to move indices DOWN — item 0 today must still be item 0 after
 * a hundred older messages arrive above it — so the list starts numbering from
 * a large constant and counts back toward zero as history loads. It bounds how
 * many entries one open thread can prepend, which a million comfortably covers.
 */
const START_INDEX = 1_000_000

/**
 * How a landing is re-asserted, and how long it may keep trying.
 *
 * The scroll cannot be one call. Every row between here and the target is
 * measured for the FIRST time as it mounts, and each measurement moves the
 * target — so the first landing is an estimate that the list then corrects out
 * from under itself. A ticker re-asserts until the row is genuinely in the
 * middle band, then stops; a ticker that kept going would be the flicker it
 * was added to prevent.
 */
const JUMP_RETRY_MS = 90
/** How long to keep centring a row that IS on screen but won't settle. */
const JUMP_CENTRE_WINDOW_MS = 1000
/** How long to wait for a row that isn't drawn yet — a page may still land. */
const JUMP_WAIT_CAP_MS = 8000

/**
 * How long a freshly opened thread keeps pinning itself to the newest message.
 *
 * Opening at the end is not one scroll but a series of them. The first page
 * mounts with every image and video frame still unmeasured, and each one that
 * decodes makes its row taller — so the content grows UNDER a view that was
 * correctly at the bottom a moment earlier, and the thread comes to rest a
 * screen or two above the newest message. That is the "opened a chat and it
 * isn't at the bottom" case: nothing scrolled, the content got longer.
 *
 * So the end is re-asserted for as long as the media is likely still settling,
 * and abandoned the instant the reader scrolls for themselves.
 */
const OPEN_SETTLE_MS = 2000

export function MonitoringThreadList({
  messages,
  ownTalkUserId,
  hasOlder,
  isLoadingOlder,
  onLoadOlder,
}: {
  messages: MonitoringMessage[]
  /** The MONITORED person — whose bubbles sit on the right. Not the viewer's. */
  ownTalkUserId: number
  hasOlder: boolean
  isLoadingOlder: boolean
  onLoadOlder: () => void
}) {
  // Day separators are woven in here, so the virtualizer sees one flat list and
  // measures a separator exactly as it measures a bubble.
  // `resolveQuoteMedia` first: a reply's thumbnail is borrowed from the thread's
  // own copy of the message it quotes, so it has to see the flat list of them.
  const entries = useMemo(() => groupMessagesByDay(resolveQuoteMedia(messages)), [messages])

  const listRef = useRef<VirtuosoHandle>(null)
  // Starts true: a thread opens at its newest message, so the jump button must
  // not flash on before the first measurement says otherwise.
  const [atBottom, setAtBottom] = useState(true)

  const jumpToLatest = () => {
    // Ends any jump in flight: the reader has asked for the end, and a ticker
    // still re-asserting a landing would drag them straight back off it.
    stopTicker()
    listRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' })
  }

  /**
   * The message a quote asked for but the thread hasn't read yet.
   *
   * A reply can point at a message a hundred pages back, so the jump is not one
   * action but a SEEK: hold the id, pull a page of history, look again. It is
   * held in state rather than driven by a loop because each page is a request
   * the effect below has to wait for — and cleared the moment the message is
   * found, or the moment there is no more history to find it in.
   */
  const [seeking, setSeeking] = useState<number | null>(null)
  /**
   * The pager, held by reference.
   *
   * `onLoadOlder` is a fresh closure on every render of the pane above, so
   * depending on it would re-run the seek effect on renders that brought no new
   * messages — asking for another page each time. Through a ref the seek
   * advances on DATA alone: one page per page that arrives.
   */
  const loadOlder = useRef(onLoadOlder)
  loadOlder.current = onLoadOlder
  /** Ringed for a moment where the jump landed, so the eye finds the message. */
  const [landedOn, setLandedOn] = useState<number | null>(null)
  const landingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * The scroller itself, for the two things Virtuoso's handle cannot answer:
   * which element a row is, and where it currently sits.
   */
  const scrollerRef = useRef<HTMLElement | null>(null)
  /** The rows, read from inside a ticker that outlives the render it started in. */
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  /**
   * The base Virtuoso adds when it STAMPS a row. Re-read rather than captured: a
   * page prepending mid-jump moves it, and a stamp from before the prepend names
   * a row that has since slid down the list.
   */
  const firstItemIndexRef = useRef(0)
  firstItemIndexRef.current = START_INDEX - entries.length
  /**
   * True from the moment a jump is asked for until its scroll has settled.
   *
   * `followOutput` is off for the duration. The reader is still sitting at the
   * bottom while history pages in, so every one of those pages otherwise reads
   * as "new content arrived at the end" and pulls the view back — landing the
   * jump and undoing it in the same breath.
   */
  const jumping = useRef(false)
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * `atBottom` as a ref, for the callbacks Virtuoso fires between renders — the
   * state is a render behind, and a height change has to be answered with where
   * the view is NOW.
   */
  const atBottomRef = useRef(true)
  atBottomRef.current = atBottom
  /**
   * When the opening window closes. Set once per mount, and the list is keyed by
   * person and chat — so entering another conversation is a new mount and gets
   * its own window.
   */
  const openUntil = useRef(Date.now() + OPEN_SETTLE_MS)
  /**
   * True once the reader has scrolled on purpose.
   *
   * The window must not fight them: someone who scrolls up into history a beat
   * after opening a chat has said where they want to be, and re-pinning the end
   * under them is worse than opening short of it. Only real input counts —
   * wheel, touch, a key — because a programmatic scroll and a deliberate one are
   * indistinguishable from the scroll event alone.
   */
  const readerMoved = useRef(false)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const moved = () => {
      readerMoved.current = true
    }
    scroller.addEventListener('wheel', moved, { passive: true })
    scroller.addEventListener('touchstart', moved, { passive: true })
    scroller.addEventListener('keydown', moved)
    return () => {
      scroller.removeEventListener('wheel', moved)
      scroller.removeEventListener('touchstart', moved)
      scroller.removeEventListener('keydown', moved)
    }
  }, [])

  /**
   * The thread got taller. Stay at the end if that is where we were.
   *
   * Instant, and by index rather than by scroll offset: the offset it would need
   * is the height it has only just changed to, and `'LAST'` asks for the row
   * instead of a number that is already stale.
   */
  const holdBottom = useCallback(() => {
    // A jump is on its way somewhere else entirely.
    if (jumping.current) return
    const opening = !readerMoved.current && Date.now() < openUntil.current
    if (!opening && !atBottomRef.current) return
    listRef.current?.scrollToIndex({ index: 'LAST', align: 'end' })
  }, [])

  const stopTicker = () => {
    if (ticker.current) clearInterval(ticker.current)
    ticker.current = null
    jumping.current = false
  }

  /**
   * Put a message on screen, in the middle, and KEEP it there for a moment.
   *
   * Three things this has to get right, and the first two are why the earlier
   * version lit the ring without moving the thread:
   *
   * - it scrolls **instantly**. A smooth scroll across several screens is a long
   *   animation, and anything that touches the scroller cancels it — the prepend
   *   corrections a history page brings, `followOutput`, the reader's own wheel.
   *   A cancelled one leaves the view where it started, which on this screen is
   *   the bottom;
   * - `scrollToIndex` takes the position in `entries`, while the DOM is stamped
   *   with `firstItemIndex + position`. The two spaces are not interchangeable,
   *   and the base is re-read every pass because a page prepending mid-jump
   *   moves it;
   * - it waits for a row that isn't drawn yet rather than giving up, since the
   *   page carrying it may land a render later.
   *
   * Virtuoso puts the row in play; the row's own element then puts itself in the
   * middle — `scrollToIndex` works off estimated heights and lands
   * approximately, and an element's rectangle cannot be approximate.
   */
  const scrollRowIntoView = useCallback((messageId: number) => {
    stopTicker()
    jumping.current = true

    /** When the row first became drawable — the centring window starts here. */
    let foundAt: number | null = null
    const waitUntil = Date.now() + JUMP_WAIT_CAP_MS

    /** One correction. True once the row is genuinely in the middle band. */
    const attempt = (): boolean => {
      const index = entriesRef.current.findIndex(
        (entry) => entry.kind === 'message' && entry.message.id === messageId,
      )
      if (index < 0) return false
      if (foundAt === null) foundAt = Date.now()

      const stamped = firstItemIndexRef.current + index
      const scroller = scrollerRef.current
      const element = scroller?.querySelector<HTMLElement>(
        `[data-item-index="${stamped}"]`,
      )

      if (element && scroller) {
        const row = element.getBoundingClientRect()
        const view = scroller.getBoundingClientRect()
        const offCentre = Math.abs(
          row.top + row.height / 2 - (view.top + view.height / 2),
        )
        // A quarter of the viewport either way is "centred": asking for the
        // exact middle would never settle on a row taller than the band.
        if (offCentre < view.height / 4) return true
        element.scrollIntoView({ block: 'center' })
        return false
      }

      // Not mounted yet — only Virtuoso can bring an index into play.
      listRef.current?.scrollToIndex({ index, align: 'center' })
      return false
    }

    setLandedOn(messageId)
    if (landingTimer.current) clearTimeout(landingTimer.current)
    landingTimer.current = setTimeout(() => setLandedOn(null), 2000)

    if (attempt()) {
      jumping.current = false
      return
    }

    ticker.current = setInterval(() => {
      if (attempt()) {
        stopTicker()
        return
      }
      // Two ways to run out: the row never turned up, or it turned up and we
      // have spent long enough failing to centre it.
      const spent =
        foundAt === null
          ? Date.now() > waitUntil
          : Date.now() - foundAt > JUMP_CENTRE_WINDOW_MS
      if (spent) stopTicker()
    }, JUMP_RETRY_MS)
  }, [])

  useEffect(
    () => () => {
      stopTicker()
      if (landingTimer.current) clearTimeout(landingTimer.current)
    },
    [],
  )

  const indexOfMessage = useCallback(
    (messageId: number) =>
      entries.findIndex(
        (entry) => entry.kind === 'message' && entry.message.id === messageId,
      ),
    [entries],
  )

  const jumpToMessage = useCallback(
    (messageId: number) => {
      if (indexOfMessage(messageId) >= 0) {
        setSeeking(null)
        scrollRowIntoView(messageId)
        return
      }
      if (!hasOlder) {
        // Nothing left to read: the quoted message is outside what this endpoint
        // will return at all, so say so instead of scrolling to nowhere.
        toasterrormsg('That message is no longer part of this conversation.')
        return
      }
      setSeeking(messageId)
      if (!isLoadingOlder) loadOlder.current()
    },
    [hasOlder, indexOfMessage, isLoadingOlder, scrollRowIntoView],
  )

  /** One step of the seek: each page that arrives is looked through, then the
      next is asked for — until the message turns up or history runs out. */
  useEffect(() => {
    if (seeking === null) return

    if (indexOfMessage(seeking) >= 0) {
      setSeeking(null)
      scrollRowIntoView(seeking)
      return
    }
    if (isLoadingOlder) return
    if (!hasOlder) {
      setSeeking(null)
      toasterrormsg('That message is no longer part of this conversation.')
      return
    }
    loadOlder.current()
    // `indexOfMessage` changes with every new page, which is what re-runs this.
  }, [seeking, indexOfMessage, hasOlder, isLoadingOlder, scrollRowIntoView])

  return (
    <div className="relative min-h-0 flex-1">
      <Virtuoso<ThreadEntry>
        ref={listRef}
        data={entries}
        /*
          `overflow-x-hidden`, and the rows' side padding is on the ROWS (see
          `itemContent`) rather than here. Padding the scroller itself widens
          what it has to scroll, which is what put a horizontal bar under the
          thread; nothing in a conversation is ever meant to scroll sideways, so
          the axis is closed off rather than merely left unused.
        */
        className="h-full overflow-x-hidden"
        // Count back from the anchor, so an entry keeps its index as older ones
        // are prepended above it.
        firstItemIndex={START_INDEX - entries.length}
        /*
          A conversation opens at its newest message, the way it was left.

          `'LAST'` with `align: 'end'`, not a computed index: a plain index says
          "put this row at the TOP of the viewport", which lands short of the
          bottom whenever the last bubble is shorter than the viewport — and an
          index also has to be rebased against `firstItemIndex`, which is one
          more thing to get wrong. This asks for the end directly.
        */
        initialTopMostItemIndex={{ index: 'LAST', align: 'end' }}
        /*
          A short thread doesn't fill the viewport; without this its bubbles
          would sit at the TOP of the pane with dead space underneath, which
          reads as a conversation scrolled away from rather than a short one.
        */
        alignToBottom
        /*
          Bubbles are measured, not declared, so a thread settles into its true
          height only once its images have loaded — and that settling is what
          left an opened chat a little short of the bottom. `'auto'` re-pins the
          end whenever the list grows while the reader is already there, and
          stays out of the way once they have scrolled up to read history.
        */
        /*
          Off while a jump is on its way somewhere — see `jumping`. A callback
          rather than the bare `"auto"`, because the decision has to be made at
          the moment content arrives, not at the render that mounted the list.
        */
        followOutput={(isAtBottom) => (jumping.current ? false : isAtBottom ? 'auto' : false)}
        scrollerRef={(element) => {
          scrollerRef.current = element instanceof HTMLElement ? element : null
        }}
        // Generous, because "near enough the bottom" is where the jump button
        // should already be gone — a few pixels of drift isn't a reader who has
        // scrolled away.
        atBottomThreshold={120}
        atBottomStateChange={setAtBottom}
        // Fires after the list re-measures — which is exactly when a decoded
        // photo has just made its row taller. See `holdBottom`.
        totalListHeightChanged={holdBottom}
        // Fetch the next page before the reader actually hits the top, so
        // history is usually already there by the time they get to it.
        startReached={() => {
          if (hasOlder && !isLoadingOlder) onLoadOlder()
        }}
        increaseViewportBy={{ top: 600, bottom: 200 }}
        components={{
          Header: () => (
            <ThreadHead hasOlder={hasOlder} isLoadingOlder={isLoadingOlder} />
          ),
          /*
            Air under the newest message.

            It has to be the list's FOOTER rather than padding on the scroller:
            `alignToBottom` measures the content against the viewport to decide
            where a short thread sits, and bottom padding on the scroller is
            outside that measurement — so the last bubble ended up flush against
            the shell's footer bar, with its clock touching the border. A footer
            row is content, so it is measured, it scrolls, and the thread comes
            to rest with a gap instead of on the seam.
          */
          Footer: () => <div className="h-6" />,
        }}
        itemContent={(index, entry) =>
          entry.kind === 'day' ? (
            <div className="flex justify-center px-4 py-3">
              {/* Bordered because on dark the card colour and the page colour
                  are the same, and the shadow is invisible there. */}
              <span className="rounded-full border bg-card px-3 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground shadow-sm">
                {entry.label}
              </span>
            </div>
          ) : (
            // The row's own side padding — see the scroller's note above for why
            // it isn't on the scroller instead.
            <div className="px-4">
              <MonitoringMessageBubble
                message={entry.message}
                own={entry.message.senderTalkUserId === ownTalkUserId}
                // `index` is in the virtual space; `entries` is not. Rebase
                // before looking at the neighbouring rows, or a run's first
                // bubble loses its name and its last loses its corner.
                startsRun={startsRun(entries, index - (START_INDEX - entries.length))}
                endsRun={endsRun(entries, index - (START_INDEX - entries.length))}
                highlighted={entry.message.id === landedOn}
                onJumpToQuote={jumpToMessage}
              />
            </div>
          )
        }
      />

      {/*
        The jump-to-latest button, on only while the reader is away from the end.
        Reading a long history is the normal use of this screen, and scrolling
        all the way back down by hand is the tax that comes with it.
      */}
      {!atBottom && (
        <button
          type="button"
          onClick={jumpToLatest}
          aria-label="Jump to latest message"
          className="absolute bottom-4 right-4 z-10 inline-flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className="size-4" />
        </button>
      )}
    </div>
  )
}

/** What sits above the oldest message — a spinner, or the end of the thread. */
function ThreadHead({
  hasOlder,
  isLoadingOlder,
}: {
  hasOlder: boolean
  isLoadingOlder: boolean
}) {
  if (isLoadingOlder) {
    return (
      <p className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Loading earlier messages…
      </p>
    )
  }
  if (hasOlder) return <div className="py-2" />
  return (
    <p className="py-3 text-center text-[11px] text-muted-foreground">
      Beginning of the conversation
    </p>
  )
}

/**
 * How long one person may pause and still be answering their own last line.
 *
 * Past a few minutes it is a new thought rather than the same breath, and
 * folding it into the block above would date the whole run by its first
 * message — which on a conversation resumed the next morning is hours out.
 */
const RUN_GAP_MS = 5 * 60 * 1000

/**
 * Whether this bubble OPENS a run — the first from its sender since the last day
 * separator, the last person to speak, or a long enough pause. Only the opener
 * carries the name and the avatar, so a burst from one person reads as one turn
 * rather than five.
 */
function startsRun(entries: ThreadEntry[], index: number): boolean {
  const current = entries[index]
  if (current?.kind !== 'message') return false

  const previous = entries[index - 1]
  // A day separator (or the top of the thread) always opens a new run.
  if (!previous || previous.kind !== 'message') return true
  return breaksRun(previous.message, current.message)
}

/**
 * Whether it CLOSES one — the bubble that takes its tail corner back, so a
 * stack of them reads as one column of paper instead of a bubble with stickers
 * beside it. A message on its own both opens and closes a run.
 */
function endsRun(entries: ThreadEntry[], index: number): boolean {
  const current = entries[index]
  if (current?.kind !== 'message') return false

  const next = entries[index + 1]
  if (!next || next.kind !== 'message') return true
  return breaksRun(current.message, next.message)
}

/** What makes two neighbouring messages two runs rather than one. */
function breaksRun(earlier: MonitoringMessage, later: MonitoringMessage): boolean {
  // A system line belongs to the conversation, not to a person, so a run cannot
  // continue across it — the message after one would be attributed to whoever
  // spoke before it.
  if (earlier.type === 'system' || later.type === 'system') return true
  if (earlier.senderTalkUserId !== later.senderTalkUserId) return true

  const from = earlier.createdAt ? Date.parse(earlier.createdAt) : NaN
  const to = later.createdAt ? Date.parse(later.createdAt) : NaN
  // An unparseable stamp is no evidence of a gap, so the run stands on the
  // sender alone rather than being broken by a missing date.
  if (Number.isNaN(from) || Number.isNaN(to)) return false
  return to - from > RUN_GAP_MS
}
