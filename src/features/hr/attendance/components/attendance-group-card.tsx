import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { attendanceInitials } from '../lib/attendance-mappers'
import { AttendanceRateBar } from './attendance-rate-bar'
import type { AttendanceGroup } from '../types'

/** One of the card's three mini counters. */
function Mini({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string
  value: number
  className: string
  valueClassName: string
}) {
  return (
    <div className={cn('rounded-lg border px-2 py-2 text-center', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn('font-heading text-lg font-semibold tabular-nums', valueClassName)}>
        {value.toLocaleString('en-IN')}
      </p>
    </div>
  )
}

/**
 * One department (or designation) as a card: its name and code, the day split
 * three ways, and the rate bar.
 *
 * The whole card is the button into the group — the chevron is a sign of where
 * it goes, not a separate target, so a tap anywhere on it lands the same place.
 *
 * `onOpen` is omitted for a group with no id (the "Unassigned" bucket): the
 * employee read is addressed by `department_id`, so there is nothing to open it
 * with. That card still counts its people, it just isn't a button — no
 * chevron, no pointer, no focus stop, rather than a click that 400s.
 */
export function AttendanceGroupCard({
  group,
  onOpen,
}: {
  group: AttendanceGroup
  onOpen?: () => void
}) {
  return (
    <Card
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (onOpen && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'p-4 transition-colors',
        onOpen &&
          'cursor-pointer hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
          {attendanceInitials(group.name)}
        </span>
        <div className="min-w-0 flex-1">
          {/* The name truncates in a card this narrow, so the full one has to
              stay reachable — through the app's tooltip, not a native `title`. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="truncate text-sm font-semibold">{group.name}</p>
            </TooltipTrigger>
            <TooltipContent>{group.name}</TooltipContent>
          </Tooltip>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {group.total.toLocaleString('en-IN')} employees
            {group.code ? ` · ${group.code}` : ''}
          </p>
        </div>
        {onOpen && (
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Mini
          label="Total"
          value={group.total}
          className="border-primary/20 bg-primary/5"
          valueClassName="text-primary"
        />
        <Mini
          label="Present"
          value={group.present}
          className="border-success/25 bg-success/5"
          valueClassName="text-success"
        />
        <Mini
          label="Absent"
          value={group.absent}
          className="border-destructive/25 bg-destructive/5"
          valueClassName="text-destructive"
        />
      </div>

      <AttendanceRateBar rate={group.attendanceRate} className="mt-3" />
    </Card>
  )
}
