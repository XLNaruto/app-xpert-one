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
