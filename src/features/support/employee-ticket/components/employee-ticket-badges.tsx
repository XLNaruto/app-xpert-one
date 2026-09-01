import { Badge, type BadgeProps } from '@/components/ui/badge'
import { categoryLabel, priorityLabel, statusLabel } from '../lib/employee-ticket-mappers'

/**
 * The three coloured labels a queued ticket is read by.
 *
 * Priority here means something narrower than on the platform desk: it ranks
 * this queue and carries no deadline, so `critical` is loud without ever being
 * an SLA breach.
 */

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  open: 'warning',
  in_progress: 'default',
  reopened: 'warning',
  resolved: 'success',
  closed: 'secondary',
}

export function EmployeeTicketStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{statusLabel(status)}</Badge>
  )
}

const PRIORITY_VARIANT: Record<string, BadgeProps['variant']> = {
  normal: 'secondary',
  medium: 'default',
  high: 'warning',
  critical: 'destructive',
}

export function EmployeeTicketPriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority] ?? 'secondary'}>
      {priorityLabel(priority)}
    </Badge>
  )
}

/** What the employee filed it under. Neutral — it routes, it doesn't rank. */
export function EmployeeTicketCategoryBadge({ category }: { category: string }) {
  return <Badge variant="outline">{categoryLabel(category)}</Badge>
}

/**
 * "Nobody has taken this."
 *
 * `needsPickup` is outstanding AND unassigned, derived server-side — the one
 * gap in the queue worth shouting about. A resolved ticket nobody was assigned
 * is history rather than a gap, so the server already reads it false and this
 * renders nothing.
 */
export function EmployeeTicketPickupBadge({ needsPickup }: { needsPickup: boolean }) {
  if (!needsPickup) return null
  return (
    <Badge variant="warning" className="text-[10px] uppercase">
      Needs pickup
    </Badge>
  )
}

/**
 * "Somebody is on it right now" — a work stretch is open.
 *
 * Deliberately separate from the status: replying does NOT start the clock, so
 * `in_progress` with the light dark is a normal, correct state — somebody
 * answered and put the ticket down. A hand-over darkens it too, until the new
 * handler picks the ticket up.
 */
export function EmployeeTicketWorkingBadge({
  isBeingWorked,
}: {
  isBeingWorked: boolean
}) {
  if (!isBeingWorked) return null
  return (
    <Badge variant="success" className="gap-1.5 text-[10px] uppercase">
      <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" />
      Being worked
    </Badge>
  )
}
