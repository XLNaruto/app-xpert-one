import { AlertTriangle, Clock } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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

/**
 * Which desk answers, and its sub-category when one was picked — one split pill,
 * `Technical │ Payroll`. Neutral by design — it's a routing fact, not a severity.
 * A long sub-category is truncated and read in full from the tooltip.
 */
export function SupportTypeBadge({
  ticket,
}: {
  ticket: Pick<SupportTicket, 'ticketType' | 'subCategoryName'>
}) {
  const desk = ticketTypeLabel(ticket.ticketType)

  if (!ticket.subCategoryName) {
    return (
      <Badge variant="outline" className="whitespace-nowrap">
        {desk}
      </Badge>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex max-w-56 cursor-default items-center overflow-hidden rounded-full border text-xs">
          <span className="shrink-0 px-2.5 py-0.5 font-semibold">{desk}</span>
          <span className="truncate border-l bg-muted/60 px-2.5 py-0.5 text-muted-foreground">
            {ticket.subCategoryName}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {desk} - {ticket.subCategoryName}
      </TooltipContent>
    </Tooltip>
  )
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
