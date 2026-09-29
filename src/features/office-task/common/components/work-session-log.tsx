import { format, parseISO } from 'date-fns'
import { Clock, Play, Square, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDuration } from '../lib/task-dates'
import type { WorkSession } from '../types'

const secondsOf = (s: WorkSession, now: number) =>
  Math.max(0, Math.floor(((s.end ? Date.parse(s.end) : now) - Date.parse(s.start)) / 1000))

const clock = (iso: string) => format(parseISO(iso), 'hh:mm:ss a')

function Figure({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

/**
 * The clock's history on one piece of work, in the attendance punch list's
 * shape: the rollup (first start, last stop, time worked), then every Start →
 * Stop stretch numbered in order. Work spans days, so each stretch carries its
 * date, and a stretch still open reads "Running" rather than a blank.
 */
export function WorkSessionLog({
  sessions,
  now = Date.now(),
  emptyText = 'The clock has not been started yet.',
}: {
  sessions: WorkSession[]
  now?: number
  emptyText?: string
}) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    )
  }

  const first = sessions[0]
  const last = sessions[sessions.length - 1]
  const total = sessions.reduce((sum, s) => sum + secondsOf(s, now), 0)
  const firstDay = format(parseISO(first.start), 'dd MMM')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Figure icon={Play} label="First Start" value={`${firstDay}, ${format(parseISO(first.start), 'hh:mm a')}`} />
        <Figure
          icon={Square}
          label="Last Stop"
          value={last.end ? `${format(parseISO(last.end), 'dd MMM')}, ${format(parseISO(last.end), 'hh:mm a')}` : 'Running'}
        />
        <Figure icon={Clock} label="Time Worked" value={formatDuration(total)} />
      </div>

      <ol className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {sessions.map((s, i) => {
          const running = !s.end
          return (
            <li
              key={`${s.start}-${i}`}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-2.5',
                running && 'border-primary/30 bg-primary/5',
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                {i + 1}
              </span>
              <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                {format(parseISO(s.start), 'dd MMM')}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                  <Play className="size-3.5 text-success" />
                  {clock(s.start)}
                </span>
                {s.end ? (
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                    <Square className="size-3.5 text-destructive" />
                    {clock(s.end)}
                  </span>
                ) : (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    Running
                  </Badge>
                )}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                {formatDuration(secondsOf(s, now))}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
