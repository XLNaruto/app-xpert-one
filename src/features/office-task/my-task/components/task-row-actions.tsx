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

/** Complete, or Submit when the work goes to an approver first. */
function HandInButton({
  needsApproval,
  busy,
  onClick,
}: {
  needsApproval: boolean
  busy: boolean
  onClick: () => void
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={needsApproval ? tone.submit : tone.complete}
      onClick={onClick}
      disabled={busy}
    >
      {needsApproval ? <Send className="size-3" /> : <Check className="size-3" />}
      {needsApproval ? 'Submit' : 'Complete'}
    </Button>
  )
}

/** Stop plus the live clock beside it. */
function StopWithClock({
  busy,
  onStop,
  workedSeconds,
}: {
  busy: boolean
  onStop: () => void
  workedSeconds: number
}) {
  return (
    <>
      <Button size="sm" variant="outline" className={tone.stop} onClick={onStop} disabled={busy}>
        <Square className="size-3 fill-current" />
        Stop
      </Button>
      <span className="w-[4.5rem] font-mono text-sm font-semibold tabular-nums">
        {formatClock(workedSeconds)}
      </span>
    </>
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
  direct = false,
}: {
  row: MySopRow
  /** Without `my-tasks:update` the board is look-only. */
  readOnly?: boolean
  /**
   * The company hands SOP runs in DIRECTLY — no Start / Resume, just Complete.
   * A clock started before the switch keeps its Stop so the time isn't lost.
   */
  direct?: boolean
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
  if (direct) {
    if (row.status !== 'pending' && row.status !== 'in_progress') return null
    return (
      <div className="flex items-center gap-1.5">
        <HandInButton needsApproval={row.needsApproval} busy={busy} onClick={onComplete} />
        {row.runningSince && (
          <StopWithClock busy={busy} onStop={onPause} workedSeconds={workedSeconds} />
        )}
      </div>
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
      <HandInButton needsApproval={row.needsApproval} busy={busy} onClick={onComplete} />
      {row.runningSince ? (
        <StopWithClock busy={busy} onStop={onPause} workedSeconds={workedSeconds} />
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
 *
 * Under DIRECT submission there's no clock and no progress notes — just
 * Complete (or Submit) for a share nobody started. A clock already running
 * from before the switch keeps its Stop, which saves progress with it.
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
  direct = false,
}: {
  row: MyProjectRow
  /** Without `my-tasks:update` the board is look-only. */
  readOnly?: boolean
  /** The company hands project shares in DIRECTLY — just Complete, no clock. */
  direct?: boolean
  /** The share's start date has come — before it, the API refuses any action. */
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
  if (direct && (row.status === 'pending' || row.status === 'in_progress')) {
    if (!canStart) return <span className="text-xs text-muted-foreground">Not started yet</span>
    return (
      <div className="flex items-center gap-1.5">
        <HandInButton needsApproval={row.needsVerification} busy={busy} onClick={onComplete} />
        {isToday && row.runningSince && (
          <StopWithClock busy={busy} onStop={onStop} workedSeconds={workedSeconds} />
        )}
      </div>
    )
  }
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
        <HandInButton needsApproval={row.needsVerification} busy={busy} onClick={onComplete} />
      )}
      {row.status === 'in_progress' &&
        isToday &&
        (row.runningSince ? (
          <StopWithClock busy={busy} onStop={onStop} workedSeconds={workedSeconds} />
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
