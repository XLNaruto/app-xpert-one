import { Pencil } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatDate } from '@/lib/utils'
import type { ScheduleDay } from '../types'

interface ShiftScheduleCellProps {
  date: string
  day: ScheduleDay | undefined
  isToday: boolean
  /** Before today — read-only, drawn muted. */
  isPast: boolean
  /** Opens the editor; absent without `shift-schedules:update`. */
  onOpen?: () => void
}

/** What the cell's state reads as. */
function stateOf(day: ScheduleDay | undefined) {
  if (!day || day.isWeekOff === null) {
    return {
      label: '—',
      tone: 'text-muted-foreground',
      text: 'Not scheduled — the week-off policy decides',
    }
  }
  return day.isWeekOff
    ? { label: 'OFF', tone: 'bg-success/15 font-semibold text-success', text: 'Scheduled off' }
    : { label: 'W', tone: 'bg-primary/10 font-medium text-primary', text: 'Scheduled working' }
}

/**
 * One date of one employee: OFF, W (working) or — (not scheduled, so the
 * week-off policy decides). A shift override reads small underneath, and a
 * MANUAL entry carries a pencil so the manager knows Generate won't touch it.
 */
export function ShiftScheduleCell({ date, day, isToday, isPast, onOpen }: ShiftScheduleCellProps) {
  const state = stateOf(day)
  const manual = day?.sourceType === 'MANUAL'
  const heading = formatDate(date, 'EEE, dd MMM yyyy')

  const className = cn(
    'relative mx-auto flex h-10 w-12 flex-col items-center justify-center rounded-md text-xs leading-tight',
    state.tone,
    isToday && 'ring-1 ring-primary/50',
    isPast && 'opacity-60',
  )

  const body = (
    <>
      {state.label}
      {day?.shiftName && (
        <span className="max-w-11 truncate text-[10px] font-normal text-muted-foreground">
          {day.shiftName}
        </span>
      )}
      {/* The pencil says "Generate won't change this" — moot on a date that's passed. */}
      {manual && !isPast && <Pencil className="absolute right-0.5 top-0.5 size-2.5 opacity-70" />}
    </>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {onOpen ? (
          <button
            type="button"
            aria-label={`${heading}: ${state.text}`}
            onClick={onOpen}
            className={cn(
              className,
              'cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/40',
            )}
          >
            {body}
          </button>
        ) : (
          <span className={className}>{body}</span>
        )}
      </TooltipTrigger>
      <TooltipContent className="space-y-0.5">
        <p className="font-semibold">{heading}</p>
        <p className="font-normal">{state.text}</p>
        {day?.shiftName && (
          <p className="font-normal">
            Shift: <span className="font-medium">{day.shiftName}</span>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
