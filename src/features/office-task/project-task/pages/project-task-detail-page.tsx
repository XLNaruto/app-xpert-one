import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Camera, CalendarRange, Repeat, ShieldCheck, Users } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/common/page-header'
import { DetailItem } from '@/components/common/detail-item'
import { EmptyState } from '@/components/common/empty-state'
import { TableRowActions } from '@/components/common/table-row-actions'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScopedDataError } from '@/features/company'
import {
  deadlineInfo,
  formatDuration,
  frequencyLabel,
  PriorityBadge,
  ProgressBar,
  TaskStatusBadge,
  todayIso,
  VerdictBadge,
} from '@/features/office-task/common'
import { useProjectTaskDetail } from '../hooks/use-project-task-detail'
import { deadlineStanding, timeTaken } from '../lib/project-work-analysis'
import type { ProjectWorkRow } from '../types'

/** One project task: what it is, and every assignee's standing — each opens their own page. */
export function ProjectTaskDetailPage({ data }: { data?: string }) {
  const { task, isLoading, notFound, error, works, goToList, openWork } = useProjectTaskDetail(
    decryptId(data),
  )

  const deadline = task?.deadline
  const updatesPerDay = task?.updatesPerDay ?? 1
  const needsVerification = task?.needsVerification ?? false

  const columns = useMemo<ColumnDef<ProjectWorkRow>[]>(
    () => [
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => <TableRowActions onView={() => openWork(row.original.id)} />,
      },
      {
        id: 'employee',
        header: 'Employee',
        enableSorting: false,
        cell: ({ row }) => (
          <button type="button" onClick={() => openWork(row.original.id)} className="cursor-pointer text-left">
            <p className="font-medium hover:text-primary">{row.original.employeeName}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.original.employeeCode}</p>
          </button>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => {
          const w = row.original
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <TaskStatusBadge status={w.status} />
              {needsVerification && (w.verdict || w.status === 'pending_approval') && (
                <VerdictBadge verdict={w.verdict} />
              )}
            </div>
          )
        },
      },
      {
        id: 'progress',
        header: 'Progress',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex w-36 items-center gap-2">
            <ProgressBar percent={row.original.latestPercent} />
            <span className="text-xs">{row.original.latestPercent}%</span>
          </div>
        ),
      },
      {
        id: 'updates',
        header: 'Updates Today',
        enableSorting: false,
        cell: ({ row }) => {
          const w = row.original
          const behind = w.status === 'in_progress' && w.updatesToday < updatesPerDay
          return (
            <span className={cn('tabular-nums', behind && 'font-medium text-amber-600 dark:text-amber-400')}>
              {w.updatesToday} / {updatesPerDay}
            </span>
          )
        },
      },
      {
        id: 'started',
        header: 'Started',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.startedAt)}</span>,
      },
      {
        id: 'completed',
        header: 'Completed',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.completedAt)}</span>,
      },
      {
        id: 'worked',
        header: 'Time Worked',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <div>
            <p className="tabular-nums">{formatDuration(row.original.workedSeconds)}</p>
            {row.original.runningSince && <p className="text-xs font-medium text-primary">Running now</p>}
          </div>
        ),
      },
      {
        id: 'taken',
        header: 'Elapsed',
        enableSorting: false,
        cell: ({ row }) => {
          const w = row.original
          const standing = deadline ? deadlineStanding(w, deadline, todayIso()) : null
          return (
            <div>
              <p className="tabular-nums">{timeTaken(w) ?? '—'}</p>
              {standing && (
                <p className={cn('text-xs', standing.late ? 'text-destructive' : 'text-success')}>{standing.label}</p>
              )}
            </div>
          )
        },
      },
    ],
    [openWork, deadline, updatesPerDay, needsVerification],
  )

  const back = (
    <Button variant="outline" onClick={goToList}>
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

  if (notFound || !task) {
    return (
      <div>
        <PageHeader title="Project Task" actions={back} />
        {error ? (
          <ScopedDataError error={error} fallback="Project task not found." what="project tasks" />
        ) : (
          <EmptyState title="Project task not found" description="It may have been deleted." />
        )}
      </div>
    )
  }

  const info = deadlineInfo(task.deadline)

  return (
    <div className="space-y-6">
      <PageHeader title={task.task} description={task.description || undefined} actions={back} />

      <Card>
        <CardContent className="space-y-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.status !== 'completed' && (
              <span
                className={cn(
                  'text-xs font-medium',
                  info.tone === 'danger' && 'text-destructive',
                  info.tone === 'warning' && 'text-amber-600 dark:text-amber-400',
                )}
              >
                {info.label}
              </span>
            )}
          </div>
          <div className="flex max-w-md items-center gap-3">
            <ProgressBar percent={task.progress} className="h-2" />
            <span className="text-sm font-semibold">{task.progress}%</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <DetailItem
              icon={Users}
              label={task.pickBy === 'designation' ? 'Designation' : 'Role'}
              value={task.appliesTo}
            />
            <DetailItem
              icon={CalendarRange}
              label="Schedule"
              value={`${formatDate(task.startDate)} → ${formatDate(task.deadline)}`}
            />
            <DetailItem icon={Repeat} label="Progress Updates" value={frequencyLabel(task.updatesPerDay)} />
            <DetailItem icon={Camera} label="Photo Proof" value={task.photoRequired ? 'Required' : 'Not required'} />
            <DetailItem
              icon={ShieldCheck}
              label="Verification"
              value={task.needsVerification ? 'Required' : 'Not required'}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Employees</h2>
        {works.error ? (
          <ScopedDataError error={works.error} fallback="Couldn't load the assignees." what="project tasks" />
        ) : (
          <DataTable
            columns={columns}
            data={works.rows}
            isLoading={works.isLoading}
            itemName="employees"
            pageSizeOptions={[5, 10, 25, 50]}
            serverPagination
            limit={works.limit}
            offset={works.offset}
            total={works.total}
            onPaginationChange={works.onPaginationChange}
            searchValue={works.search}
            onSearchChange={works.setSearch}
            searchPlaceholder="Search employee name or code…"
          />
        )}
      </div>

    </div>
  )
}
