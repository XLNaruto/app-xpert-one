import {
  differenceInCalendarDays,
  format,
  isSameDay,
  isValid,
  parseISO,
} from 'date-fns'
import type { MonitoringMessage } from '../types'

/**
 * How the screen tells time — the conversation-row stamp, the bubble clock, and
 * the day separators a thread is broken up by.
 *
 * Pure, like everything in `lib/`. Every input is the API's ISO string, and an
 * unparseable one degrades to an empty label rather than "Invalid Date".
 */

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? date : null
}

/**
 * The stamp on a conversation row.
 *
 * A chat from today is worth a clock time; anything older is worth a date, since
 * "3:42 pm" on a three-week-old conversation says nothing useful.
 */
export function formatChatTimestamp(value: string | null): string {
  const date = toDate(value)
  if (!date) return ''
  return isSameDay(date, new Date()) ? format(date, 'h:mm a') : format(date, 'dd MMM yyyy')
}

/** The clock under a bubble. */
export function formatMessageTime(value: string | null): string {
  const date = toDate(value)
  return date ? format(date, 'h:mm a') : ''
}

/** The full stamp a bubble's clock carries as its tooltip. */
export function formatMessageFullTime(value: string | null): string {
  const date = toDate(value)
  return date ? format(date, 'EEEE, dd MMM yyyy · h:mm a') : ''
}

/**
 * The pill that separates one day of a thread from the next.
 *
 * The last week reads as words — a conversation is remembered as "Friday" far
 * more readily than as a date — and everything before it as the date itself.
 */
export function formatDaySeparator(value: string | null): string {
  const date = toDate(value)
  if (!date) return ''

  const daysAgo = differenceInCalendarDays(new Date(), date)
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  if (daysAgo > 1 && daysAgo < 7) return format(date, 'EEEE').toUpperCase()
  return format(date, 'dd MMM yyyy').toUpperCase()
}

/**
 * A thread cut into days, ready to render top to bottom.
 *
 * Done here rather than in the component so the pane maps over one flat list of
 * separators and bubbles instead of nesting a loop inside a loop. Messages
 * arrive oldest-first, so a new group opens whenever the calendar day changes.
 */
export type ThreadEntry =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: MonitoringMessage }

export function groupMessagesByDay(messages: MonitoringMessage[]): ThreadEntry[] {
  const entries: ThreadEntry[] = []
  let currentDay: Date | null = null

  for (const message of messages) {
    const date = toDate(message.createdAt)

    if (date && (!currentDay || !isSameDay(date, currentDay))) {
      currentDay = date
      entries.push({
        kind: 'day',
        // The message id, not the date: a search result can put the same day on
        // screen more than once, and two identical keys would collide.
        key: `day-${message.id}`,
        label: formatDaySeparator(message.createdAt),
      })
    }

    entries.push({ kind: 'message', key: `msg-${message.id}`, message })
  }

  return entries
}
