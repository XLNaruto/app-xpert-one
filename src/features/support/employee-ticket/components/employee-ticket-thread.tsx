import { MessagesSquare } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { EmployeeTicketAttachment } from './employee-ticket-attachment'
import type { EmployeeTicketMessage } from '../types'

/**
 * The conversation, oldest first — the employee on the left, our office on the
 * right, the way a chat reads.
 *
 * It's rendered whole rather than paged because the API answers it whole: a help
 * ticket holds a handful of messages, not a feed, and a conversation split
 * across pages reads backwards.
 */
export function EmployeeTicketThread({
  messages,
}: {
  messages: EmployeeTicketMessage[]
}) {
  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <MessagesSquare className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No replies yet. The first one you send picks the ticket up.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isOffice = message.authorType === 'user'
        return (
          <div
            key={message.id}
            className={cn('flex', isOffice ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl border px-4 py-3 sm:max-w-[70%]',
                isOffice
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-border bg-muted/40',
              )}
            >
              <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
                <span className="font-semibold text-foreground">
                  {message.authorName || (isOffice ? 'Your office' : 'Employee')}
                </span>
                <span className="text-muted-foreground">
                  {isOffice ? 'Office' : 'Employee'}
                </span>
                <span className="text-muted-foreground">
                  {formatDateTime(message.createdAt)}
                </span>
              </p>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground">
                {message.body}
              </p>
              {message.attachmentUrl && (
                <EmployeeTicketAttachment attachmentKey={message.attachmentUrl} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
