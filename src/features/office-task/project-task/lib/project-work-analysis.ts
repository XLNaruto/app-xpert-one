import { localDateOf } from '@/features/office-task/common'
import type { ProjectWorkActivity, ProjectWorkDetail } from '../types'

/** What the timeline is built from: the share's summary plus its raw activity. */
export type WorkTimelineInput = Pick<
  ProjectWorkDetail,
  'startedAt' | 'submittedAt' | 'completedAt' | 'note' | 'verdict' | 'verdictAt' | 'verdictBy' | 'verdictRemarks'
> &
  ProjectWorkActivity

/** One moment in an assignee's work on a task, oldest first in `workActivity`. */
export interface WorkEvent {
  /** ISO date-time. */
  at: string
  kind: 'started' | 'stopped' | 'resumed' | 'progress' | 'submitted' | 'approved' | 'rejected' | 'completed'
  title: string
  detail?: string
}

/**
 * Everything that happened on one assignee's share, in order: when they
 * started, each stop and resume of the clock, each progress update, hand-in,
 * the verdict and completion.
 */
export function workActivity(work: WorkTimelineInput): WorkEvent[] {
  const events: WorkEvent[] = []
  if (work.startedAt) events.push({ at: work.startedAt, kind: 'started', title: 'Started' })
  // The clock: each Stop, and each Start after the first, is a Resume. A stop
  // that is the hand-in itself isn't listed separately.
  work.sessions.forEach((session, i) => {
    if (i > 0) events.push({ at: session.start, kind: 'resumed', title: 'Resumed' })
    if (session.end && session.end !== work.submittedAt) {
      events.push({ at: session.end, kind: 'stopped', title: 'Stopped' })
    }
  })
  for (const n of work.progress) {
    events.push({ at: n.at, kind: 'progress', title: `Progress · ${n.percent}%`, detail: n.note || undefined })
  }
  if (work.submittedAt) {
    events.push({ at: work.submittedAt, kind: 'submitted', title: 'Handed in', detail: work.note || undefined })
  }
  if (work.verdict && work.verdictAt) {
    events.push({
      at: work.verdictAt,
      kind: work.verdict,
      title: `${work.verdict === 'approved' ? 'Approved' : 'Sent back'}${work.verdictBy ? ` by ${work.verdictBy}` : ''}`,
      detail: work.verdictRemarks || undefined,
    })
  }
  // An approval completes the work at the same moment — don't list it twice.
  if (work.completedAt && !(work.verdict === 'approved' && work.verdictAt === work.completedAt)) {
    events.push({ at: work.completedAt, kind: 'completed', title: 'Completed' })
  }
  // Stopping is done with a progress update at the same instant — show the update first.
  const rank = (e: WorkEvent) => (e.kind === 'stopped' ? 1 : 0)
  return events.sort((a, b) => a.at.localeCompare(b.at) || rank(a) - rank(b))
}

/** "3d 4h", "5h 12m", "18m", "40s" — a span of time, coarse enough to read at a glance. */
export function spanLabel(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/**
 * How long the work has taken: start → completion, or start → now while it's
 * still open. `null` before it has started.
 */
export function timeTaken(
  work: { startedAt: string | null; completedAt: string | null },
  now = Date.now(),
): string | null {
  if (!work.startedAt) return null
  const end = work.completedAt ? Date.parse(work.completedAt) : now
  return spanLabel(end - Date.parse(work.startedAt))
}

/**
 * Against the deadline: finished on time / N days late, or — still open —
 * how far it is past the deadline. `null` when open and not yet due.
 */
export function deadlineStanding(
  work: { completedAt: string | null },
  deadline: string,
  today: string,
): { label: string; late: boolean } | null {
  // Timestamps are UTC — the day it was finished is the LOCAL one.
  const done = work.completedAt ? localDateOf(work.completedAt) : undefined
  const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
  if (done) {
    const late = days(deadline, done)
    return late > 0 ? { label: `${late} day${late === 1 ? '' : 's'} late`, late: true } : { label: 'On time', late: false }
  }
  const over = days(deadline, today)
  return over > 0 ? { label: `${over} day${over === 1 ? '' : 's'} overdue`, late: true } : null
}
