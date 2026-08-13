import { AlertTriangle, Clock } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { priorityLabel, statusLabel, ticketTypeLabel } from '../lib/support-ticket-mappers'
import type { SupportTicket } from '../types'

/**
 * The three coloured labels a ticket is read by. Declared here rather than
 * reaching for the generic `<StatusBadge>` because this desk's vocabulary is its
 * own: `reopened` is not a failure, and `critical` has to out-shout `high`.
 */

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  open: 'warning',
  in_progress: 'default',
  reopened: 'warning',
  resolved: 'success',
  closed: 'secondary',
}

export function SupportStatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{statusLabel(status)}</Badge>
}

const PRIORITY_VARIANT: Record<string, BadgeProps['variant']> = {
  normal: 'secondary',
  medium: 'default',
  high: 'warning',
  critical: 'destructive',
}

export function SupportPriorityBadge({
  priority,
  className,
}: {
  priority: string
  className?: string
}) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority] ?? 'secondary'} className={className}>
      {priorityLabel(priority)}
    </Badge>
  )
}

/** Which desk answers. Neutral by design — it's a routing fact, not a severity. */
export function SupportTypeBadge({ ticketType }: { ticketType: string }) {
  return <Badge variant="outline">{ticketTypeLabel(ticketType)}</Badge>
}

/**
 * The deadline as a single chip: red once breached, quiet otherwise, and absent
 * altogether when the subscription promised nothing for this desk at this
 * severity — there is no clock to show, and a blank cell says so honestly.
 */
export function SupportDueBadge({
  ticket,
  label,
  className,
}: {
  ticket: Pick<SupportTicket, 'isOverdue'>
  label: string | null
  className?: string
}) {
  if (!label) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-sm',
        ticket.isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      {ticket.isOverdue ? (
        <AlertTriangle className="size-3.5 shrink-0" />
      ) : (
        <Clock className="size-3.5 shrink-0" />
      )}
      {label}
    </span>
  )
}
