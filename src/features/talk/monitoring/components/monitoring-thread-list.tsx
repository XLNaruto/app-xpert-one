import { useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { groupMessagesByDay, type ThreadEntry } from '../lib/talk-monitoring-dates'
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
  const entries = useMemo(() => groupMessagesByDay(messages), [messages])

  const listRef = useRef<VirtuosoHandle>(null)
  // Starts true: a thread opens at its newest message, so the jump button must
  // not flash on before the first measurement says otherwise.
  const [atBottom, setAtBottom] = useState(true)

  const jumpToLatest = () =>
    listRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' })

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
        followOutput="auto"
        // Generous, because "near enough the bottom" is where the jump button
        // should already be gone — a few pixels of drift isn't a reader who has
        // scrolled away.
        atBottomThreshold={120}
        atBottomStateChange={setAtBottom}
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
                // before looking at the row above, or a run's first bubble loses
                // its name.
                showSender={startsRun(entries, index - (START_INDEX - entries.length))}
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
 * Whether this bubble opens a run — the first from its sender since the last day
 * separator or the last person to speak. Only the opener carries the name and
 * the avatar, so a burst from one person reads as one turn rather than five.
 */
function startsRun(entries: ThreadEntry[], index: number): boolean {
  const current = entries[index]
  if (current?.kind !== 'message') return false

  const previous = entries[index - 1]
  // A day separator (or the top of the thread) always opens a new run.
  if (!previous || previous.kind !== 'message') return true
  return previous.message.senderTalkUserId !== current.message.senderTalkUserId
}
