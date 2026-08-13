import type { LucideIcon } from 'lucide-react'
import { CalendarRange } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ReportPeriod } from '../types'

interface ReportPreviewHeaderProps {
  icon: LucideIcon
  /** The type being previewed — "Pay Slip", "PF Challan", … */
  title: string
  /** The period as the heading reads it — "July 2026", or a range. */
  subtitle: string
  /** The salary cycle the statutory reports resolve; omit where none is sent. */
  period?: ReportPeriod | null
  /** Rows matching the filter across every page. */
  total?: number
}

/**
 * The band between the filter card and the table: what is being previewed, for
 * which period, and how much of it there is.
 *
 * The cycle is printed rather than inferred from the month. With a cycle start
 * day configured the period is not the calendar month, and that difference is
 * exactly what decides which attendance the figures below were priced on — a
 * statement read against the wrong fortnight reconciles against nothing.
 */
export function ReportPreviewHeader({
  icon: Icon,
  title,
  subtitle,
  period,
  total,
}: ReportPreviewHeaderProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="inline-flex items-center gap-2 font-heading text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title} — Preview
      </span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>

      {period?.from && period?.to && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarRange className="size-3.5" />
          Cycle {formatDate(period.from)} — {formatDate(period.to)}
        </span>
      )}

      {typeof total === 'number' && (
        <span className="ml-auto text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{total}</span>{' '}
          {total === 1 ? 'record' : 'records'}
        </span>
      )}
    </div>
  )
}
