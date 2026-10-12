import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  Clock,
  Flag,
  Hourglass,
  ListChecks,
  MessageSquareText,
  Paperclip,
  Play,
  Send,
  Timer,
} from 'lucide-react'
import { decryptParams } from '@/lib/crypto'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/common/page-header'
import { DetailItem } from '@/components/common/detail-item'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScopedDataError } from '@/features/company'
import {
  formatDuration,
  updatesHeading,
  ProgressBar,
  ProofStrip,
  TaskStatusBadge,
  todayIso,
  useNow,
  VerdictBadge,
  WorkSessionLog,
} from '@/features/office-task/common'
import { useProjectTaskEmployee } from '../hooks/use-project-task-employee'
import { deadlineStanding, timeTaken, workActivity } from '../lib/project-work-analysis'
import { WorkActivityFlow } from '../components/work-activity-flow'

/** One assignee's work on a project task: where they stand, how long it's taken, and everything they did. */
export function ProjectTaskEmployeePage({ data }: { data?: string }) {
  const ids = data ? decryptParams<{ id?: number; workId?: number }>(data) : null
  const { task, work, activity, activityLoading, isLoading, notFound, error, goBack } =
    useProjectTaskEmployee(ids?.id, ids?.workId)
  // The running stretch in the work log ticks.
  const now = useNow(!!work?.runningSince)

  const back = (
    <Button variant="outline" onClick={goBack}>
      <ArrowLeft className="size-4" />
      Back
    </Button>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (notFound || !task || !work) {
    return (
      <div>
        <PageHeader title="Employee Work" actions={back} />
        {error ? (
          <ScopedDataError error={error} fallback="This employee may no longer be on the task." what="project tasks" />
        ) : (
          <EmptyState title="Not found" description="This employee may no longer be on the task." />
        )}
      </div>
    )
  }

  const standing = deadlineStanding(work, work.deadline, todayIso())
  const events = activity ? workActivity({ ...work, ...activity }) : []
  const target = work.updatesPerDay ?? task.updatesPerDay
  const frequency = work.updateFrequency ?? task.updateFrequency
  const behind = work.status === 'in_progress' && work.updatesThisPeriod < target
  const who = work.taskOtherId
    ? [work.mobileNumber, work.delegate && `updated by ${work.delegate.name}`].filter(Boolean).join(' · ')
    : work.employeeCode

  return (
    <div className="space-y-6">
      <PageHeader title={work.employeeName} description={[who, work.task].filter(Boolean).join(' · ')} actions={back} />

      <Card>
        <CardContent className="space-y-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={work.status} />
            {task.needsVerification && (work.verdict || work.status === 'pending_approval') && (
              <VerdictBadge verdict={work.verdict} />
            )}
            {standing && (
              <span className={cn('text-xs font-medium', standing.late ? 'text-destructive' : 'text-success')}>
                {standing.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailItem icon={Play} label="Started" value={formatDateTime(work.startedAt)} />
            <DetailItem icon={Send} label="Handed In" value={formatDateTime(work.submittedAt)} />
            <DetailItem icon={CalendarCheck} label="Completed" value={formatDateTime(work.completedAt)} />
            <DetailItem
              icon={Timer}
              label="Time Worked"
              value={`${formatDuration(work.workedSeconds)}${work.runningSince ? ' · running' : ''}`}
            />
            <DetailItem
              icon={Hourglass}
              label={work.completedAt ? 'Elapsed' : 'Elapsed So Far'}
              value={timeTaken(work) ?? '—'}
            />
            <DetailItem icon={Flag} label="Deadline" value={formatDate(work.deadline)} />
            <DetailItem
              icon={ListChecks}
              label={updatesHeading(frequency)}
              value={`${work.updatesThisPeriod} / ${target}${behind ? ' · behind' : ''}`}
            />
            <DetailItem icon={Clock} label="Total Updates" value={String(work.totalUpdates)} />
            <DetailItem icon={CalendarClock} label="Last Update" value={formatDateTime(work.lastUpdateAt)} />
          </div>
        </CardContent>
      </Card>

      {work.submittedAt && (
        <Card>
          <CardContent className="space-y-4 py-5">
            <div>
              <h3 className="text-sm font-semibold">Handed In</h3>
              <p className="text-xs text-muted-foreground">
                What was submitted with the work on {formatDateTime(work.submittedAt)}.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <MessageSquareText className="size-3.5" />
                Note
              </p>
              <p className="whitespace-pre-wrap text-sm">
                {work.note || <span className="text-muted-foreground">No note added.</span>}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Paperclip className="size-3.5" />
                Proof
              </p>
              <ProofStrip files={work.proof} required={task.photoRequired} size="sm" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 py-5">
          <div>
            <h3 className="text-sm font-semibold">Work Log</h3>
            <p className="text-xs text-muted-foreground">Every time the clock was started and stopped.</p>
          </div>
          {activityLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <WorkSessionLog sessions={activity?.sessions ?? []} now={now} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <h3 className="text-sm font-semibold">Activity</h3>
            <div className="flex w-full max-w-sm items-center gap-3">
              <span className="text-xs text-muted-foreground">Progress</span>
              <ProgressBar percent={work.latestPercent} className="h-2" />
              <span className="text-sm font-semibold tabular-nums">{work.latestPercent}%</span>
            </div>
          </div>
          {activityLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <WorkActivityFlow events={events} open={work.status !== 'completed'} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
