import { Ban, CornerUpLeft, Forward } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { UNKNOWN_PERSON } from '../lib/talk-monitoring-mappers'
import { formatMessageFullTime, formatMessageTime } from '../lib/talk-monitoring-dates'
import { MonitoringMessageMedia } from './monitoring-message-media'
import type { MonitoringMessage } from '../types'

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
  showSender,
}: {
  message: MonitoringMessage
  own: boolean
  /** False when the previous bubble was from the same person — one name per run. */
  showSender: boolean
}) {
  const senderPhoto = useMediaUrl(message.senderPhoto)

  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-muted px-3 py-1 text-center text-[11px] font-medium text-muted-foreground">
          {message.body || 'Conversation updated'}
        </span>
      </div>
    )
  }

  const senderName = message.senderName || UNKNOWN_PERSON

  return (
    <div className={cn('flex py-1', own ? 'justify-end' : 'justify-start')}>
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
          {showSender && (
            <Avatar
              name={senderName}
              src={senderPhoto || undefined}
              className="size-8"
            />
          )}
        </span>

        {/* The name shares the bubble's column rather than being pushed clear of
            the rail with padding, so the two can't fall out of step. */}
        <div
          className={cn(
            'flex min-w-0 flex-col',
            own ? 'items-end' : 'items-start',
          )}
        >
          {showSender && !own && (
            <span className="mb-0.5 text-xs font-semibold leading-tight text-primary">
              {senderName}
            </span>
          )}

          {message.isDeleted ? (
            <DeletedBubble message={message} own={own} />
          ) : (
            <div
              className={cn(
                'min-w-0 rounded-2xl px-3 py-2 shadow-sm',
                own
                  ? 'rounded-br-sm bg-primary text-white dark:bg-primary-hover'
                  // On dark, `--card` is the page colour and the shadow is
                  // invisible — an incoming bubble needs its own edge or it
                  // dissolves into the thread behind it.
                  : 'rounded-bl-sm border bg-card',
              )}
            >
              {message.isForwarded && (
                <p
                  className={cn(
                    'mb-1 flex items-center gap-1 text-[11px] italic',
                    own ? 'text-white/75' : 'text-muted-foreground',
                  )}
                >
                  <Forward className="size-3" />
                  {/* The original usually sits in a chat these participants
                      can't see — a monitor reaches it only through its own
                      participant. */}
                  Forwarded
                </p>
              )}

              {message.quote && <QuotedMessage quote={message.quote} own={own} />}

              <MonitoringMessageMedia media={message.media} className="mb-1" />

              {message.body && (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {message.body}
                </p>
              )}

              <MessageMeta message={message} own={own} />
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
function DeletedBubble({ message, own }: { message: MonitoringMessage; own: boolean }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2',
        own ? 'rounded-br-sm' : 'rounded-bl-sm',
      )}
    >
      <p className="flex items-center gap-1.5 text-xs italic text-muted-foreground">
        <Ban className="size-3.5 shrink-0 text-destructive/70" />
        This message was deleted
      </p>
      <MessageMeta message={message} own={false} />
    </div>
  )
}

/** The message this one is replying to. */
function QuotedMessage({
  quote,
  own,
}: {
  quote: NonNullable<MonitoringMessage['quote']>
  own: boolean
}) {
  return (
    <div
      className={cn(
        'mb-1.5 flex gap-1.5 rounded-lg border-l-2 px-2 py-1',
        own ? 'border-l-white/60 bg-white/15' : 'border-l-primary bg-muted/70',
      )}
    >
      <CornerUpLeft
        className={cn(
          'mt-0.5 size-3 shrink-0',
          own ? 'text-white/75' : 'text-muted-foreground',
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-[11px] font-semibold',
            own ? 'text-white' : 'text-primary',
          )}
        >
          {quote.senderName || UNKNOWN_PERSON}
        </p>
        <p
          className={cn(
            'truncate text-[11px]',
            own ? 'text-white/75' : 'text-muted-foreground',
            !quote.body && 'italic',
          )}
        >
          {/* Null once the quoted message was deleted for everyone. */}
          {quote.body || (quote.isDeleted ? 'This message was deleted' : 'Attachment')}
        </p>
      </div>
    </div>
  )
}

/** The clock, and the edit marker beside it. */
function MessageMeta({ message, own }: { message: MonitoringMessage; own: boolean }) {
  const time = formatMessageTime(message.createdAt)
  if (!time) return null

  return (
    <p
      className={cn(
        'mt-0.5 flex items-center justify-end gap-1 text-[10px]',
        own ? 'text-white/75' : 'text-muted-foreground',
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
