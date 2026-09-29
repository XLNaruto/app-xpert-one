import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { dayLabel } from '@/features/office-task/common'

/** Prev / date / next, the day's name, and a jump back to today. */
export function DayBar({
  date,
  isToday,
  onChange,
  onPrev,
  onNext,
  onToday,
  onRefresh,
}: {
  date: string
  isToday: boolean
  onChange: (date: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onRefresh: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Previous day" onClick={onPrev}>
        <ChevronLeft className="size-4" />
      </Button>
      <DatePicker value={date} onChange={onChange} className="w-40" />
      <Button variant="outline" size="icon" aria-label="Next day" onClick={onNext}>
        <ChevronRight className="size-4" />
      </Button>
      <span className="px-1 text-sm font-semibold">{dayLabel(date)}</span>
      {!isToday && (
        <Button variant="secondary" size="sm" onClick={onToday}>
          Today
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onRefresh}>
        <RefreshCw className="size-4" />
        Refresh
      </Button>
    </div>
  )
}
