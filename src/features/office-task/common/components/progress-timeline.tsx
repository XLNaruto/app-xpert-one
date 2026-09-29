import { formatDateTime, cn } from '@/lib/utils'
import { ProofStrip } from './proof-strip'
import type { ProgressNote } from '../types'

/** How far along a percent is, as one colour — the bar, the timeline dot and the % chip all share it. */
function percentTone(percent: number) {
  if (percent >= 100) return { fill: 'bg-success', chip: 'bg-success/10 text-success' }
  if (percent >= 60) return { fill: 'bg-primary', chip: 'bg-primary/10 text-primary' }
  if (percent >= 25) return { fill: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
  return { fill: 'bg-orange-500', chip: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' }
}

/** A thin progress bar, coloured by how far along it is. */
export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const value = Math.max(0, Math.min(100, percent))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-all', percentTone(value).fill)}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

/** Progress notes, newest first — date, percent, note and photos. */
export function ProgressTimeline({
  notes,
  emptyText = 'No progress recorded yet.',
}: {
  notes: ProgressNote[]
  emptyText?: string
}) {
  if (notes.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
  }
  const ordered = [...notes].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {ordered.map((n) => (
        <li key={n.id} className="relative">
          <span
            className={cn(
              'absolute -left-[26px] top-1 size-3 rounded-full ring-4 ring-background',
              percentTone(n.percent).fill,
            )}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDateTime(n.at)}</span>
            <span className={cn('rounded-full px-2 py-0.5 font-semibold', percentTone(n.percent).chip)}>
              {n.percent}%
            </span>
          </div>
          {n.note && <p className="mt-1 text-sm">{n.note}</p>}
          {n.photos.length > 0 && (
            <div className="mt-2">
              <ProofStrip files={n.photos} size="sm" />
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
