import { Check, Eye, Play, Send, Square } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatClock } from '@/features/office-task/common'
import type { MyProjectRow, MySopRow } from '../types'

/** Compact sizing shared by every row button, so a row stays one line tall. */
const compact = 'h-6 gap-1 rounded-md px-2 text-[11px]'

/**
 * Soft buttons: a dark border, a light wash and dark ink, all in the action's
 * own colour — so a row of them reads at a glance without shouting.
 */
const tone = {
  start: `${compact} border-primary/60 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary`,
  stop: `${compact} border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive`,
  complete: `${compact} border-success/60 bg-success/10 text-success hover:bg-success/20 hover:text-success`,
  submit:
    `${compact} border-violet-500/60 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-400`,
  neutral: `${compact} border-border bg-muted/50 text-foreground hover:bg-muted`,
}

/** Handed in or done — nothing left to act on, so the row offers a look instead. */
const isSettled = (status: MySopRow['status']) => status === 'pending_approval' || status === 'completed'

function ViewButton({ onView }: { onView: () => void }) {
  return (
    <Button size="sm" variant="outline" className={tone.complete} onClick={onView}>
      <Eye className="size-3" />
      View
    </Button>
  )
}

/** Explains a Start/Resume held back by another running clock (a disabled button fires no hover). */
function LockedHint({ locked, children }: { locked: boolean; children: ReactNode }) {
  if (!locked) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed">{children}</span>
      </TooltipTrigger>
      <TooltipContent>Stop the running task first</TooltipContent>
    </Tooltip>
  )
}

/**
 * An SOP run's buttons: Start → Stop (with the live clock) / Resume → Complete
 * (or Submit when it needs approval). Only today's runs can be worked. "Stop"
 * pauses the clock — the run stays in progress until it's completed.
 */
export function SopRowActions({
  row,
  isToday,
  busy,
  startLocked,
  onStart,
  onPause,
  onComplete,
  onView,
  workedSeconds,
  readOnly = false,
}: {
  row: MySopRow
  /** Without `my-tasks:update` the board is look-only. */
  readOnly?: boolean
  /** Another run's clock is going — Start/Resume wait until it's stopped. */
  startLocked: boolean
  /** Banked + live seconds, ticking while the run is going. */
  workedSeconds: number
  isToday: boolean
  busy: boolean
  onStart: () => void
  onPause: () => void
  onComplete: () => void
  onView: () => void
}) {
  if (readOnly || isSettled(row.status)) return <ViewButton onView={onView} />
  if (!isToday) {
    return row.status === 'pending' ? (
      <span className="text-xs text-muted-foreground">Not today</span>
    ) : (
      null
    )
  }
  if (row.status === 'pending') {
    return (
      <LockedHint locked={startLocked}>
        <Button size="sm" variant="outline" className={tone.start} onClick={onStart} disabled={busy || startLocked}>
          <Play className="size-3" />
          Start
        </Button>
      </LockedHint>
    )
  }
  if (row.status !== 'in_progress') return null

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className={row.needsApproval ? tone.submit : tone.complete}
        onClick={onComplete}
        disabled={busy}
      >
        {row.needsApproval ? <Send className="size-3" /> : <Check className="size-3" />}
        {row.needsApproval ? 'Submit' : 'Complete'}
      </Button>
      {row.runningSince ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={onPause}
            disabled={busy}
            className={tone.stop}
          >
            <Square className="size-3 fill-current" />
            Stop
          </Button>
          <span className="w-[4.5rem] font-mono text-sm font-semibold tabular-nums">
            {formatClock(workedSeconds)}
          </span>
        </>
      ) : (
        <LockedHint locked={startLocked}>
          <Button size="sm" variant="outline" className={tone.start} onClick={onStart} disabled={busy || startLocked}>
            <Play className="size-3" />
            Resume
          </Button>
        </LockedHint>
      )}
    </div>
  )
}

/**
 * A project share's buttons: Complete (or Submit), then Stop (with the live
 * clock) / Resume. Stop asks for a progress update and stops with it — there's
 * no separate Progress button. The clock only runs from today's board;
 * "Stop" pauses it — the work stays in progress until it's handed in.
 */
export function ProjectRowActions({
  row,
  canStart,
  isToday,
  busy,
  startLocked,
  workedSeconds,
  onStart,
  onStop,
  onComplete,
  onView,
  readOnly = false,
}: {
  row: MyProjectRow
  /** Without `my-tasks:update` the board is look-only. */
  readOnly?: boolean
  canStart: boolean
  isToday: boolean
  busy: boolean
  /** Another clock is going — Start/Resume wait until it's stopped. */
  startLocked: boolean
  /** Banked + live seconds, ticking while the clock runs. */
  workedSeconds: number
  onStart: () => void
  /** Opens Record Progress — saving the update is what stops the clock. */
  onStop: () => void
  onComplete: () => void
  onView: () => void
}) {
  if (readOnly || row.status === 'completed') return <ViewButton onView={onView} />
  if (row.status === 'pending') {
    if (!canStart) return <span className="text-xs text-muted-foreground">Not started yet</span>
    if (!isToday) return null
    return (
      <LockedHint locked={startLocked}>
        <Button size="sm" variant="outline" className={tone.start} onClick={onStart} disabled={busy || startLocked}>
          <Play className="size-3" />
          Start
        </Button>
      </LockedHint>
    )
  }
  if (row.status !== 'in_progress' && row.status !== 'pending_approval') return null

  return (
    <div className="flex items-center gap-1.5">
      {row.status === 'in_progress' && (
        <Button
          size="sm"
          variant="outline"
          className={row.needsVerification ? tone.submit : tone.complete}
          onClick={onComplete}
          disabled={busy}
        >
          {row.needsVerification ? <Send className="size-3" /> : <Check className="size-3" />}
          {row.needsVerification ? 'Submit' : 'Complete'}
        </Button>
      )}
      {row.status === 'in_progress' &&
        isToday &&
        (row.runningSince ? (
          <>
            <Button size="sm" variant="outline" className={tone.stop} onClick={onStop} disabled={busy}>
              <Square className="size-3 fill-current" />
              Stop
            </Button>
            <span className="w-[4.5rem] font-mono text-sm font-semibold tabular-nums">
              {formatClock(workedSeconds)}
            </span>
          </>
        ) : (
          <LockedHint locked={startLocked}>
            <Button size="sm" variant="outline" className={tone.start} onClick={onStart} disabled={busy || startLocked}>
              <Play className="size-3" />
              Resume
            </Button>
          </LockedHint>
        ))}
      {row.status === 'pending_approval' && <ViewButton onView={onView} />}
    </div>
  )
}
