import { useEffect, useRef } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { MessagesSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { EmployeeTicketAttachment } from './employee-ticket-attachment'
import type { EmployeeTicketMessage } from '../types'

/** 'Today' / 'Yesterday' / '01 Sep 2026' — the divider a chat puts between days. */
function dayLabel(value: string) {
  try {
    const date = parseISO(value)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'dd MMM yyyy')
  } catch {
    return value
  }
}

/** Bubbles carry the clock only; the day lives on the divider above them. */
function timeLabel(value: string) {
  try {
    return format(parseISO(value), 'hh:mm a')
  } catch {
    return value
  }
}

function dayKey(value: string) {
  try {
    return format(parseISO(value), 'yyyy-MM-dd')
  } catch {
    return value
  }
}

/**
 * The conversation, oldest first — the employee on the left, our office on the
 * right, the way a chat reads.
 *
 * It's rendered whole rather than paged because the API answers it whole: a help
 * ticket holds a handful of messages, not a feed, and a conversation split
 * across pages reads backwards. The pane scrolls itself and lands on the newest
 * message, so a long thread never pushes the composer off the screen.
 */
export function EmployeeTicketThread({
  messages,
}: {
  messages: EmployeeTicketMessage[]
}) {
  const endRef = useRef<HTMLDivElement>(null)

  // The newest message is the one being answered — open there, and follow along
  // as replies land.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 py-12 text-center">
        <MessagesSquare className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No replies yet. The first one you send picks the ticket up.
        </p>
      </div>
    )
  }

  return (
    <div className="max-h-[32rem] space-y-1 overflow-y-auto rounded-xl border bg-muted/30 p-4">
      {messages.map((message, index) => {
        const isOffice = message.authorType === 'user'
        const previous = messages[index - 1]
        const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt)
        // Consecutive messages from the same side on the same day are one turn:
        // only the first of them wears a name and an avatar.
        const startsTurn =
          newDay || !previous || previous.authorType !== message.authorType
        const name = message.authorName || (isOffice ? 'Your office' : 'Employee')

        return (
          <div key={message.id}>
            {newDay && (
              <div className="flex items-center gap-3 py-4">
                <span className="h-px flex-1 bg-border" />
                <span className="rounded-full border bg-background px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {dayLabel(message.createdAt)}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            <div
              className={cn(
                'flex items-end gap-2',
                startsTurn ? 'mt-3 first:mt-0' : 'mt-1',
                isOffice ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              {/* The gutter is held even on a continued turn so bubbles stay aligned. */}
              {startsTurn ? (
                <Avatar
                  name={name}
                  className={cn(
                    'size-8 text-[11px]',
                    isOffice
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted-foreground/15 text-muted-foreground',
                  )}
                />
              ) : (
                <span className="size-8 shrink-0" aria-hidden />
              )}

              <div
                className={cn(
                  'flex max-w-[85%] flex-col sm:max-w-[70%]',
                  isOffice ? 'items-end' : 'items-start',
                )}
              >
                {startsTurn && (
                  <p className="mb-1 flex items-baseline gap-2 px-1 text-xs">
                    <span className="font-semibold text-foreground">{name}</span>
                    <span className="text-muted-foreground">
                      {isOffice ? 'Office' : 'Employee'}
                    </span>
                  </p>
                )}

                <div
                  className={cn(
                    'w-fit px-3.5 py-2 shadow-sm',
                    isOffice
                      ? 'rounded-2xl rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-2xl rounded-bl-sm border bg-background text-foreground',
                  )}
                >
                  {message.body && (
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {message.body}
                    </p>
                  )}
                  {message.attachmentUrl && (
                    <EmployeeTicketAttachment
                      attachmentKey={message.attachmentUrl}
                      className={cn(message.body ? 'mt-2' : 'mt-0')}
                    />
                  )}
                  <span
                    className={cn(
                      'mt-1 block text-right text-[10px] leading-none',
                      isOffice
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground',
                    )}
                  >
                    {timeLabel(message.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}
