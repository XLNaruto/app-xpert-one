import { cn } from '@/lib/utils'
import { attendanceBarWidth } from '../lib/attendance-mappers'

/**
 * The Attendance Rate line: the label, the percentage, and the bar underneath.
 *
 * The bar is coloured by the rate rather than always green — a red 0% and a
 * green 0% read very differently at a glance, and this screen is scanned, not
 * studied.
 */
export function AttendanceRateBar({
  rate,
  className,
}: {
  rate: number
  className?: string
}) {
  const tone =
    rate >= 75 ? 'text-success' : rate >= 40 ? 'text-warning' : 'text-destructive'
  const fill =
    rate >= 75 ? 'bg-success' : rate >= 40 ? 'bg-warning' : 'bg-destructive'

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Attendance Rate</span>
        <span className={cn('text-xs font-semibold tabular-nums', tone)}>
          {Math.round(rate)}%
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(rate)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Attendance rate"
      >
        <div
          className={cn('h-full rounded-full transition-[width]', fill)}
          style={{ width: attendanceBarWidth(rate) }}
        />
      </div>
    </div>
  )
}
