import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CalendarClock, MessageSquareReply, PlayCircle, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TIME_SPENT_HINT, TIME_TO_RESOLVE_HINT } from '../constants'
import { formatDuration } from '../lib/employee-ticket-mappers'
import { EmployeeTicketWorkingBadge } from './employee-ticket-badges'
import { EmployeeTicketWorkSessionsPanel } from './employee-ticket-work-sessions'
import type { EmployeeTicket, EmployeeTicketWorkSessions } from '../types'

interface TimeMetricProps {
  icon: LucideIcon
  label: string
  /** The one line that stops effort being read as calendar time, or the reverse. */
  hint: string
  seconds: number | null
  /** What to show when the thing being measured hasn't happened yet. */
  emptyLabel: string
  accent?: boolean
  children?: ReactNode
}

/**
 * One duration, with the sentence that says WHICH KIND of duration it is.
 *
 * The hint is not decoration. A ticket picked up on Friday and finished on
 * Monday has three days of wall clock and perhaps forty minutes of hands-on
 * effort; a reader who confuses the two draws the opposite conclusion about how
 * much work it was.
 */
function TimeMetric({
  icon: Icon,
  label,
  hint,
  seconds,
  emptyLabel,
  accent,
  children,
}: TimeMetricProps) {
  const value = formatDuration(seconds)
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        accent && 'border-primary/25 bg-primary/5',
      )}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
        {children}
      </p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          value ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {value ?? emptyLabel}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

interface EmployeeTicketTimingProps {
  ticket: EmployeeTicket
  workSessions: EmployeeTicketWorkSessions | undefined
  isWorkSessionsOpen: boolean
  onWorkSessionsOpenChange: (open: boolean) => void
  isLoadingWorkSessions: boolean
  workSessionsError?: unknown
}

/**
 * How long the ticket took — four numbers, and they are NOT interchangeable.
 *
 * Exactly one of them is effort: hands-on time, the sum of every stretch
 * somebody was genuinely on the ticket. The other three are calendar time, which
 * runs through nights, weekends and everything the office wasn't doing. They're
 * laid out apart and labelled in the platform console's own words for that
 * reason.
 *
 * The three elapsed figures are null until the thing they measure has happened.
 * Wall clock is always there — it counts up to now while the ticket is
 * outstanding, which is what an untouched row is aged with.
 */
export function EmployeeTicketTiming({
  ticket,
  workSessions,
  isWorkSessionsOpen,
  onWorkSessionsOpenChange,
  isLoadingWorkSessions,
  workSessionsError,
}: EmployeeTicketTimingProps) {
  return (
    <>
      <div className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* EFFORT — the only one here that isn't calendar time. */}
        <TimeMetric
          icon={Timer}
          label="Time spent working"
          hint={TIME_SPENT_HINT}
          seconds={ticket.activeWorkSeconds}
          emptyLabel="Not started"
          accent
        >
          <EmployeeTicketWorkingBadge isBeingWorked={ticket.isBeingWorked} />
        </TimeMetric>

        {/*
          Resolved, this is the elapsed time to resolve. Still outstanding, it's
          the wall clock — always present, counting up to now — which is exactly
          the same measurement not yet finished, so it belongs in one tile
          rather than two that would show the same number.
        */}
        <TimeMetric
          icon={CalendarClock}
          label={ticket.resolvedAt ? 'Total time to resolve' : 'Open for'}
          hint={
            ticket.resolvedAt
              ? TIME_TO_RESOLVE_HINT
              : `${TIME_TO_RESOLVE_HINT} — still counting`
          }
          seconds={
            ticket.resolvedAt ? ticket.timeToResolveSeconds : ticket.wallClockSeconds
          }
          emptyLabel="—"
        />

        <TimeMetric
          icon={MessageSquareReply}
          label="Time to first reply"
          hint="raised until the office first wrote to the employee"
          seconds={ticket.timeToFirstResponseSeconds}
          emptyLabel="Not answered yet"
        />

        <TimeMetric
          icon={PlayCircle}
          label="Time to start"
          hint="raised until somebody first picked it up"
          seconds={ticket.timeToStartSeconds}
          emptyLabel="Not started yet"
        />
      </div>

      <EmployeeTicketWorkSessionsPanel
        open={isWorkSessionsOpen}
        onOpenChange={onWorkSessionsOpenChange}
        data={workSessions}
        isLoading={isLoadingWorkSessions}
        error={workSessionsError}
      />
    </>
  )
}
