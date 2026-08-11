import { ChevronRight, Clock, LogIn, LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { formatClockTime } from '../lib/attendance-mappers'
import { DAY_STATUS_LABEL } from '../constants'
import type { AttendanceEmployee } from '../types'

/** One punch time, or nothing at all when there's none on record. */
function Punch({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LogIn
  label: string
  value: string
}) {
  if (!value) return null
  // The icon is the only thing naming this time — the app's tooltip says which
  // it is, rather than the OS's own late, unstyled `title` bubble.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="tabular-nums">{value}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * One person's day behind a card.
 *
 * The row branches on `status`: an absent row carries no attendance at all — the
 * API sends `''` for the three time fields, meaning "nothing on record" — so it
 * shows the pill and nothing else rather than three em dashes pretending to be
 * data. `day_status` rides alongside as a second pill only when it says
 * something the Present/Absent pill doesn't (leave, a holiday, a weekly off).
 */
export function AttendanceEmployeeRow({
  employee,
  onOpen,
}: {
  employee: AttendanceEmployee
  /** Opens that person's month — where the "why" behind an absent day lives. */
  onOpen: () => void
}) {
  // `photo` is an object key, not a URL — resolve it against the media base.
  const photo = useMediaUrl(employee.photo)
  const present = employee.status === 'present'
  const dayStatus = employee.dayStatus
  const showsDayStatus =
    dayStatus === 'leave' || dayStatus === 'holiday' || dayStatus === 'weekly_off' || dayStatus === 'half_day'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar
        name={employee.fullName || employee.name}
        src={photo || undefined}
        className={cn(
          'size-10',
          present ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
        )}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {employee.fullName || employee.name || '—'}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {employee.code && (
            <span>
              CODE:{' '}
              <span className="rounded bg-muted px-1.5 py-0.5 font-medium tabular-nums text-foreground">
                {employee.code}
              </span>
            </span>
          )}
          <Punch icon={LogIn} label="Check in" value={formatClockTime(employee.checkIn)} />
          <Punch
            icon={LogOut}
            label="Check out"
            value={formatClockTime(employee.checkOut)}
          />
          {/* `totalHour` is a duration, not a clock time — it never goes
              through `formatClockTime`. */}
          {/* The stored rollup counts CLOSED sessions only, so it reads low
              while somebody is still checked in — say so on hover. */}
          <Punch icon={Clock} label="Hours on closed sessions" value={employee.totalHour} />
        </p>
      </div>

      <div className="flex items-center gap-2">
        {showsDayStatus && dayStatus && (
          <Badge variant="secondary">{DAY_STATUS_LABEL[dayStatus]}</Badge>
        )}
        <Badge variant={present ? 'success' : 'destructive'}>
          {present ? 'Present' : 'Absent'}
        </Badge>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  )
}
