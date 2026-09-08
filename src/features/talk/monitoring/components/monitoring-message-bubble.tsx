import { Ban, CornerUpLeft, FileText, Forward, Music, Play } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { UNKNOWN_PERSON, countJumboEmoji } from '../lib/talk-monitoring-mappers'
import { formatMessageFullTime, formatMessageTime } from '../lib/talk-monitoring-dates'
import { MonitoringMessageMedia } from './monitoring-message-media'
import type { MessageQuote, MonitoringMessage } from '../types'

/**
 * One row of the thread.
 *
 * Three shapes travel in one type and the branches are taken in this order,
 * which is the order the API's own semantics demand:
 *
 * 1. a `system` line — nobody sent it, and its `body` is the sentence the API
 *    already rendered from `system_data`, so it is drawn as a centred pill
 *    rather than as anybody's bubble;
 * 2. a TOMBSTONE — `is_deleted_for_everyone`, whose `type` is still the original
 *    (`image` on a withdrawn photo), which is exactly why this is checked before
 *    the type and not after;
 * 3. an ordinary bubble.
 *
 * `own` is the MONITORED person's side, not the viewer's — the monitor is in
 * none of these conversations. Putting the person being monitored on the right
 * is what makes a thread readable as "what they said, and what was said to
 * them".
 *
 * An own bubble is white on sky-500 in BOTH themes, and deliberately does NOT
 * use `text-primary-foreground`: on dark that token is near-black ink, picked
 * for buttons on the brighter sky-400 the dark theme makes `--primary`. Dark
 * ink inside a chat bubble read as a disabled control, so the surface drops to
 * `--primary-hover` (sky-500 — the very colour light mode already pairs with
 * white) and every layer on top of it, down to the clock and the quoted reply,
 * is a white at some opacity.
 */
export function MonitoringMessageBubble({
  message,
  own,
  startsRun,
  endsRun,
  highlighted = false,
  onJumpToQuote,
}: {
  message: MonitoringMessage
  own: boolean
  /** First of a run by one person — the only bubble that carries name and avatar. */
  startsRun: boolean
  /** Last of that run — the bubble that closes the stack's shape. */
  endsRun: boolean
  /** Briefly ringed after a jump landed on it, so the eye finds it. */
  highlighted?: boolean
  /**
   * Go to the message this one is replying to — the only way back to the
   * context a reply was written against, and history is walked back to it if it
   * hasn't been read yet. Absent where there is no thread to scroll.
   */
  onJumpToQuote?: (messageId: number) => void
}) {
  const senderPhoto = useMediaUrl(message.senderPhoto)

  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-2">
        {/* Capped and breakable: the sentence is built from names and a group
            title the API gives us, and a group renamed to one unbroken
            200-character run is a legal rename. `rounded-2xl` rather than a full
            pill, because a pill radius on two lines reads as a lozenge. */}
        <span className="max-w-[85%] rounded-2xl bg-muted px-3 py-1 text-center text-[11px] font-medium wrap-anywhere text-muted-foreground">
          {message.body || 'Conversation updated'}
        </span>
      </div>
    )
  }

  const senderName = message.senderName || UNKNOWN_PERSON

  /**
   * Whether this bubble's attachments include something the album TILES.
   *
   * Only a picture or a video frame can carry the floating timestamp: it is a
   * plate laid over the bottom-right of the artwork, and there has to be artwork
   * to lay it on. A document or a voice note is a ROW — an icon, a filename, its
   * size — and floating the time over that corner puts it on top of them.
   */
  const hasTiles = message.media.some(
    (item) => item.kind === 'image' || item.kind === 'video',
  )
  /**
   * A bubble that is nothing BUT an album drops its padding and floats the
   * timestamp over the last tile, so the photos meet the bubble's own corners —
   * the picture is the message, and a frame of chrome around it says nothing.
   */
  const mediaOnly =
    hasTiles && !message.body && !message.quote && !message.isForwarded && !message.isDeleted
  /**
   * An album WITH chrome around it — a "Forwarded" tag, a quote, a caption —
   * sits in ONE even frame: the same inset on all four sides, so the label, the
   * photos and the timestamp share every edge instead of stepping in and out.
   * The inset lives on the bubble alone; nothing inside adds its own.
   */
  const framedMedia = message.media.length > 0 && !mediaOnly
  /**
   * A message that is nothing but a handful of emoji is drawn large and WITHOUT
   * a bubble — the emoji is the whole message, and chrome around three glyphs
   * reads as an afterthought rather than as the point. Only when there is
   * nothing else to compete with it: a quote, a "Forwarded" tag or an attachment
   * all mean the emoji is a caption, and a caption stays at reading size.
   */
  const jumboEmoji =
    message.media.length === 0 &&
    !message.quote &&
    !message.isForwarded &&
    !message.isDeleted
      ? countJumboEmoji(message.body)
      : null

  return (
    <div
      className={cn(
        'flex',
        own ? 'justify-end' : 'justify-start',
        startsRun ? 'pt-3' : 'pt-1',
      )}
    >
      <div
        className={cn(
          // `items-start` is what keeps the photo level with the name: bottom-
          // aligning it instead let the two drift apart as the bubble grew, so a
          // tall one left the avatar stranded at its foot.
          // `gap-3`, not `gap-2`: the name sits at the very top of the column
          // and so runs right up against the avatar at a tighter gap.
          'flex max-w-[min(85%,32rem)] items-start gap-3',
          own && 'flex-row-reverse',
        )}
      >
        {/* The avatar rail is held even on a continued run, so every bubble of
            one person starts on the same line as the first. */}
        <span className="w-8 shrink-0">
          {startsRun && (
            <Avatar name={senderName} src={senderPhoto || undefined} className="size-8" />
          )}
        </span>

        {/* The name shares the bubble's column rather than being pushed clear of
            the rail with padding, so the two can't fall out of step. */}
        <div className={cn('flex min-w-0 flex-col', own ? 'items-end' : 'items-start')}>
          {startsRun && !own && (
            <span className="mb-0.5 text-xs font-semibold leading-tight text-primary">
              {senderName}
            </span>
          )}

          {message.isDeleted ? (
            <DeletedBubble
              message={message}
              own={own}
              endsRun={endsRun}
              highlighted={highlighted}
            />
          ) : (
            <div
              className={cn(
                // `min-w-0` is load-bearing, not tidying: a flex item's automatic
                // minimum size is its MIN-CONTENT width, and that beats `max-w`
                // — so one unbroken 60-character run would stretch the column
                // past its cap. Zeroing the floor lets the cap hold, and
                // `wrap-anywhere` on the text below is what makes min-content
                // small enough to honour it.
                'relative min-w-0 overflow-hidden rounded-2xl',
                // The landing mark after a jump. A ring rather than a changed
                // fill: the bubble's own colour is what says whose it is, and
                // recolouring it to say "here" would trade one fact for another.
                highlighted && 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background',
                // A quote is two lines with a picture beside it, capped at
                // whatever the message below needs — under a one-word reply that
                // would leave a sliver, so a bubble carrying one gets a floor.
                message.quote && 'min-w-[11rem]',
                mediaOnly ? 'p-1' : framedMedia ? 'p-1.5' : 'px-3 py-2',
                jumboEmoji
                  ? // The bubble steps aside entirely and the emoji sits on the
                    // thread's own background, the way it was sent.
                    'bg-transparent p-0 shadow-none'
                  : own
                    ? 'bg-primary text-white shadow-sm dark:bg-primary-hover'
                    // On dark, `--card` is the page colour and the shadow is
                    // invisible — an incoming bubble needs its own edge or it
                    // dissolves into the thread behind it.
                    : 'border bg-card shadow-sm',
                // The stack's shape. On the tail side a run reads as one column
                // of paper: the FIRST bubble squares off where the tail grows out
                // of it, the ones under it keep a tight corner top and bottom so
                // the seams stay visible, and the LAST takes the full curve back
                // to close the stack. A message on its own is both first and
                // last, and comes out with the tail corner square.
                !jumboEmoji &&
                  (own
                    ? cn(
                        startsRun ? 'rounded-tr-none' : 'rounded-tr-sm',
                        !endsRun && 'rounded-br-sm',
                      )
                    : cn(
                        startsRun ? 'rounded-tl-none' : 'rounded-tl-sm',
                        !endsRun && 'rounded-bl-sm',
                      )),
              )}
            >
              {message.isForwarded && (
                <p
                  className={cn(
                    'mb-1.5 flex items-center gap-1.5 text-[11px] italic',
                    own ? 'text-white/75' : 'text-muted-foreground',
                  )}
                >
                  <Forward className="size-3 shrink-0" aria-hidden />
                  {/* The original usually sits in a chat these participants
                      can't see — a monitor reaches it only through its own
                      participant. */}
                  Forwarded
                </p>
              )}

              {message.quote && (
                <QuotedMessage
                  quote={message.quote}
                  own={own}
                  onJump={onJumpToQuote}
                />
              )}

              <MonitoringMessageMedia media={message.media} own={own} />

              {message.body && (
                <p
                  className={cn(
                    // Message text is the one thing on this screen that is read
                    // rather than scanned, so it gets the looser line height.
                    // `wrap-anywhere`, not `break-words`: both break a long word
                    // once it overflows, but only `anywhere` also shrinks the
                    // element's min-content size — the number the flex row
                    // measures the bubble by.
                    'whitespace-pre-wrap wrap-anywhere text-sm leading-[1.45]',
                    // A caption under an album keeps the album's own edge.
                    framedMedia && 'mt-1.5',
                    // Fewer emoji, bigger each — one on its own is the whole
                    // message and can afford the room; three still have to fit.
                    jumboEmoji === 1 && 'text-[3.5rem] leading-tight',
                    jumboEmoji === 2 && 'text-[2.75rem] leading-tight',
                    jumboEmoji === 3 && 'text-4xl leading-tight',
                    jumboEmoji !== null && (own ? 'text-right' : 'text-left'),
                  )}
                >
                  {message.body}
                </p>
              )}

              <MessageMeta
                message={message}
                own={own}
                mediaOnly={mediaOnly}
                framedMedia={framedMedia}
                jumbo={jumboEmoji !== null}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * A message withdrawn for everyone.
 *
 * Its text was cleared from the row when that happened, so monitoring has none
 * to show either — the row survives only so replies to it still resolve. Drawn
 * as an outline rather than a filled bubble: it marks the SHAPE of something
 * said and then taken back, which is itself the fact worth recording.
 */
function DeletedBubble({
  message,
  own,
  endsRun,
  highlighted,
}: {
  message: MonitoringMessage
  own: boolean
  endsRun: boolean
  highlighted: boolean
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2',
        highlighted && 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background',
        own
          ? cn('rounded-tr-sm', !endsRun && 'rounded-br-sm')
          : cn('rounded-tl-sm', !endsRun && 'rounded-bl-sm'),
      )}
    >
      <p className="flex items-center gap-1.5 text-xs italic text-muted-foreground">
        <Ban className="size-3.5 shrink-0 text-destructive/70" />
        This message was deleted
      </p>
      {/* `own: false` — the tombstone has no fill, so its clock takes the muted
          colour on both sides rather than white on nothing. */}
      <MessageMeta message={message} own={false} />
    </div>
  )
}

/** The message this one is replying to — clicking it goes there. */
function QuotedMessage({
  quote,
  own,
  onJump,
}: {
  quote: MessageQuote
  own: boolean
  onJump?: (messageId: number) => void
}) {
  return (
    <button
      type="button"
      // Disabled rather than hidden when there is nowhere to go, so the quote
      // keeps its shape and the reply reads the same either way.
      disabled={!onJump}
      onClick={() => onJump?.(quote.id)}
      aria-label="Go to the replied message"
      className={cn(
        // The thumbnail sits on the END of the quote and the words run beside it
        // — the picture is the recognisable half, so it takes the edge where the
        // eye lands, and the text keeps its own line to truncate on. One even
        // inset on all four sides: a tile bled to the right edge only left the
        // words pinned to the left one.
        'mb-1.5 flex w-full items-center gap-2 overflow-hidden rounded-lg border-l-2 p-1.5 text-left text-xs',
        'transition-opacity enabled:cursor-pointer enabled:hover:opacity-80',
        own ? 'border-l-white/60 bg-black/15' : 'border-l-primary bg-muted/70',
      )}
    >
      <CornerUpLeft
        className={cn('size-3 shrink-0', own ? 'text-white/75' : 'text-muted-foreground')}
        aria-hidden
      />
      {/* `w-0`, not merely `min-w-0`. The line below is `truncate`, which is
          `white-space: nowrap` — so its MAX-content width is the whole quoted
          message, and the bubble, which sizes to its widest child, was stretched
          to the full length of the message being replied to instead of ellipsing
          it. A zero base width contributes nothing to that measurement: the
          bubble sizes to the reply's OWN text and the quote takes what it lands
          on. */}
      <span className="w-0 min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-semibold',
            own ? 'text-white' : 'text-primary',
          )}
        >
          {quote.senderName || UNKNOWN_PERSON}
        </span>
        <span
          className={cn(
            'block truncate',
            own ? 'text-white/75' : 'text-muted-foreground',
            !quote.body && 'italic',
          )}
        >
          {quoteText(quote)}
        </span>
      </span>
      <QuoteThumb quote={quote} own={own} />
    </button>
  )
}

/**
 * The one line a quote shows.
 *
 * `body` is null once the quoted message was withdrawn, and on a bare
 * attachment — which is named by its type instead, in the same words the
 * conversation rows use, so a quote and a row never disagree.
 */
function quoteText(quote: MessageQuote): string {
  if (quote.isDeleted) return 'This message was deleted'
  const body = quote.body?.trim()
  if (body) return body
  return QUOTE_TYPE[quote.type] ?? 'Message'
}

const QUOTE_TYPE: Record<string, string> = {
  image: 'Photo',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  system: 'Update',
  text: 'Message',
}

/**
 * The picture on a quote — the thumbnail beside "Photo" on a reply.
 *
 * Nothing at all for a text quote or a tombstone, so a quote stays one line of
 * words in the common case. A kind with no picture to show (a voice note, a
 * document, a video the API sent no poster for) gets its icon on a plain tile
 * instead: the same footprint, so a run of replies doesn't step in and out.
 *
 * `mediaKind` and `mediaThumbnail` don't come from the API's own `reply_to` —
 * that is a summary, not the message — they are filled in from the thread's
 * loaded copy of the quoted message by `resolveQuoteMedia()`, and stay null for
 * a quote that sits further back in history than the pages read so far.
 */
function QuoteThumb({ quote, own }: { quote: MessageQuote; own: boolean }) {
  const thumbnail = useMediaUrl(quote.mediaThumbnail)
  const kind = quote.mediaKind
  if (!kind || quote.isDeleted) return null

  return (
    <span
      className={cn(
        'relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md',
        own ? 'bg-black/20' : 'bg-muted',
      )}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : kind === 'audio' ? (
        <Music className="size-4 opacity-70" aria-hidden />
      ) : kind === 'video' ? (
        <Play className="size-4 opacity-70" aria-hidden />
      ) : (
        <FileText className="size-4 opacity-70" aria-hidden />
      )}
      {/* A poster frame is a still, and a still of a video is indistinguishable
          from a photo without this. */}
      {kind === 'video' && thumbnail && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="size-3.5 text-white" aria-hidden />
        </span>
      )}
    </span>
  )
}

/** The clock, and the edit marker beside it. */
function MessageMeta({
  message,
  own,
  mediaOnly = false,
  framedMedia = false,
  jumbo = false,
}: {
  message: MonitoringMessage
  own: boolean
  /** Floats the line over the album's last tile, on a plate of its own. */
  mediaOnly?: boolean
  framedMedia?: boolean
  /** No bubble behind it, so the line takes the muted colour instead. */
  jumbo?: boolean
}) {
  const time = formatMessageTime(message.createdAt)
  if (!time) return null

  return (
    <p
      className={cn(
        'flex items-center gap-1 text-[10px] tabular-nums',
        mediaOnly
          ? 'absolute right-2.5 bottom-2.5 rounded-full bg-black/55 px-1.5 py-0.5 text-white'
          : 'mt-0.5 justify-end',
        framedMedia && 'mt-1.5 mr-0.5',
        jumbo
          ? 'text-muted-foreground'
          : !mediaOnly && (own ? 'text-white/75' : 'text-muted-foreground'),
      )}
    >
      {message.isEdited && (
        // The product records THAT a message was edited, not a diff — so there
        // is nothing to reveal here beyond the word itself.
        <span className="italic">edited</span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{time}</span>
        </TooltipTrigger>
        <TooltipContent>{formatMessageFullTime(message.createdAt)}</TooltipContent>
      </Tooltip>
    </p>
  )
}
