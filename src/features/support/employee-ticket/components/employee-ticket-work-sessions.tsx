import { ChevronDown, Timer, UserRound } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatDuration } from '../lib/employee-ticket-mappers'
import type { EmployeeTicketWorkSessions } from '../types'

interface EmployeeTicketWorkSessionsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: EmployeeTicketWorkSessions | undefined
  isLoading: boolean
  error?: unknown
}

/**
 * "Who spent what" — the stretches behind the ticket's hands-on effort.
 *
 * An expandable panel under the time-spent figure rather than a screen of its
 * own: it's the breakdown of a number already on display, and the list is a
 * handful of rows, not a feed (the endpoint isn't even paged). It's fetched only
 * once opened, so a ticket nobody interrogates costs one round trip.
 *
 * `summary.seconds` always equals the ticket's own hands-on figure — both are
 * measured by the database, so the two can't disagree.
 */
export function EmployeeTicketWorkSessionsPanel({
  open,
  onOpenChange,
  data,
  isLoading,
  error,
}: EmployeeTicketWorkSessionsProps) {
  const summary = data?.summary

  return (
    <div className="col-span-full rounded-lg border">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'bg-muted/40',
        )}
      >
        <Timer className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Who spent what</span>
        {summary && (
          <span className="text-xs text-muted-foreground">
            {summary.sessions} session{summary.sessions === 1 ? '' : 's'} ·{' '}
            {summary.handlers} handler{summary.handlers === 1 ? '' : 's'}
          </span>
        )}
        {/* A running stretch means somebody has it in their hands right now. */}
        {summary && summary.openSessions > 0 && (
          <Badge variant="success" className="text-[10px] uppercase">
            {summary.openSessions} running
          </Badge>
        )}
        <ChevronDown
          className={cn(
            'ml-auto size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-t px-3 py-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(error, "Couldn't load the work sessions.")}
            </p>
          ) : !data || data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nobody has started on this yet. A stretch opens the first time
              somebody picks the ticket up — replying doesn't start the clock.
            </p>
          ) : (
            <ul className="divide-y">
              {/* Oldest first, as the endpoint answers them. */}
              {data.items.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
                >
                  <div className="leading-tight">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                      {session.userName ?? `User #${session.userId}`}
                      {/* No end means they have it right now, and the figure
                          beside it is counting up to the present. */}
                      {!session.endedAt && (
                        <Badge variant="success" className="text-[10px] uppercase">
                          Open
                        </Badge>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(session.startedAt)} →{' '}
                      {session.endedAt ? formatDateTime(session.endedAt) : 'now'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatDuration(session.seconds)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
