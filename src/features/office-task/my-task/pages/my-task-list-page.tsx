import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarClock, ClipboardCheck, FolderKanban, Undo2 } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable } from '@/components/data-table'
import { cn, formatDate } from '@/lib/utils'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import {
  deadlineInfo,
  formatDuration,
  PriorityBadge,
  ProgressBar,
  RuleIcons,
  TaskStatusBadge,
  todayIso,
  type Verdict,
} from '@/features/office-task/common'
import { useMyTaskBoard } from '../hooks/use-my-task-board'
import { FILTER_LABELS } from '../lib/my-task-filters'
import { DayBar } from '../components/day-bar'
import { ProjectRowActions, SopRowActions } from '../components/task-row-actions'
import { CompleteTaskDialog } from '../components/complete-task-dialog'
import { ProgressDialog } from '../components/progress-dialog'
import { TaskDetailDialog } from '../components/task-detail-dialog'
import type { MyProjectRow, MySopRow, MyTaskFilter, MyTaskTab } from '../types'

/**
 * Beside the name of a task the approver returned: a small red icon, with who
 * sent it back and why on hover — the row stays clean, the reason is one hover away.
 */
function SentBack({
  verdict,
  remarks,
  by,
}: {
  verdict: Verdict | null
  remarks: string
  by: string | null
}) {
  if (verdict !== 'rejected') return null
  const reason = remarks.trim()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label="Sent back"
          className="inline-grid size-5 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"
        >
          <Undo2 className="size-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <p className="font-semibold">Sent back{by ? ` by ${by}` : ''}</p>
        <p className="mt-0.5 whitespace-pre-wrap opacity-90">
          {reason ? `“${reason}”` : 'Redo it and submit again.'}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * "Updates 1/2 today" — progress notes recorded on the viewed day against the
 * task's per-day target. Amber while an open task is still short.
 */
function UpdatesToday({ row }: { row: MyProjectRow }) {
  const behind = row.status === 'in_progress' && row.updatesToday < row.updatesPerDay
  return (
    <p className={cn('text-xs', behind ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
      Updates {row.updatesToday}/{row.updatesPerDay} today
    </p>
  )
}

/** My Tasks — the employee's day: SOP runs and project tasks, worked from here. */
export function MyTaskListPage() {
  const board = useMyTaskBoard()

  const sopColumns = useMemo<ColumnDef<MySopRow>[]>(
    () => [
      {
        id: 'action',
        header: 'Action',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <SopRowActions
            row={row.original}
            isToday={board.isToday}
            busy={board.busyId === row.original.id}
            startLocked={board.anyRunning && !row.original.runningSince}
            onStart={() => board.startSop(row.original)}
            onPause={() => board.pauseSop(row.original)}
            onComplete={() => board.openComplete({ kind: 'sop', row: row.original })}
            onView={() => board.openView({ kind: 'sop', row: row.original })}
            workedSeconds={board.workedSeconds(row.original)}
            readOnly={!board.canAct}
          />
        ),
      },
      {
        id: 'task',
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className="min-w-72 max-w-96 cursor-pointer text-left"
            onClick={() => board.openView({ kind: 'sop', row: row.original })}
          >
            <p className="flex items-center gap-1.5 font-medium hover:text-primary">
              {row.original.task}
              <SentBack
                verdict={row.original.verdict}
                remarks={row.original.verdictRemarks}
                by={row.original.verdictBy}
              />
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.templateName}
              {row.original.slots > 1 && ` · Run ${row.original.slot} of ${row.original.slots}`}
            </p>
          </button>
        ),
      },
      {
        id: 'needs',
        header: 'Needs',
        enableSorting: false,
        cell: ({ row }) => <RuleIcons photo={row.original.photoRequired} approval={row.original.needsApproval} />,
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <TaskStatusBadge
              status={row.original.status}
              paused={row.original.status === 'in_progress' && !row.original.runningSince}
            />
          </div>
        ),
      },
      {
        id: 'time',
        header: 'Timelog Total',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        // What's banked from finished runs — the live counter sits in Action.
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatDuration(board.bankedSeconds(row.original))}
          </span>
        ),
      },
    ],
    // The clock ticks through `workedSeconds`, so the columns follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.workedSeconds, board.isToday, board.busyId, board.anyRunning, board.canAct],
  )

  const projectColumns = useMemo<ColumnDef<MyProjectRow>[]>(
    () => [
      {
        id: 'action',
        header: 'Action',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <ProjectRowActions
            row={row.original}
            canStart={row.original.startDate <= todayIso()}
            isToday={board.isToday}
            busy={board.busyProjectId === row.original.id}
            startLocked={board.anyRunning && !row.original.runningSince}
            workedSeconds={board.workedSeconds(row.original)}
            onStart={() => board.startProject(row.original)}
            onStop={() => board.openProgress(row.original)}
            onComplete={() => board.openComplete({ kind: 'project', row: row.original })}
            onView={() => board.openView({ kind: 'project', row: row.original })}
            readOnly={!board.canAct}
          />
        ),
      },
      {
        id: 'task',
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className="min-w-72 max-w-96 cursor-pointer text-left"
            onClick={() => board.openView({ kind: 'project', row: row.original })}
          >
            <p className="flex items-center gap-1.5 font-medium hover:text-primary">
              {row.original.task}
              <SentBack
                verdict={row.original.verdict}
                remarks={row.original.verdictRemarks}
                by={row.original.verdictBy}
              />
            </p>
            <UpdatesToday row={row.original} />
          </button>
        ),
      },
      {
        id: 'priority',
        header: 'Priority',
        enableSorting: false,
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        id: 'schedule',
        header: 'Schedule',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatDate(row.original.startDate)} → {formatDate(row.original.deadline)}
          </span>
        ),
      },
      {
        id: 'remaining',
        header: 'Remaining',
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.status === 'completed') {
            return <span className="text-xs text-muted-foreground">Delivered</span>
          }
          const info = deadlineInfo(row.original.deadline)
          return (
            <span
              className={cn(
                'whitespace-nowrap text-sm',
                info.tone === 'danger' && 'font-medium text-destructive',
                info.tone === 'warning' && 'font-medium text-amber-600 dark:text-amber-400',
              )}
            >
              {info.label}
            </span>
          )
        },
      },
      {
        id: 'progress',
        header: 'Progress',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex w-28 items-center gap-2">
            <ProgressBar percent={row.original.latestPercent} />
            <span className="text-xs">{row.original.latestPercent}%</span>
          </div>
        ),
      },
      {
        id: 'needs',
        header: 'Needs',
        enableSorting: false,
        cell: ({ row }) => <RuleIcons photo={row.original.photoRequired} approval={row.original.needsVerification} />,
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <TaskStatusBadge status={row.original.status} />
          </div>
        ),
      },
      {
        id: 'time',
        header: 'Timelog Total',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        // What's banked from stopped sessions — the live counter sits in Action.
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatDuration(board.bankedSeconds(row.original))}
          </span>
        ),
      },
    ],
    // The clock ticks through `workedSeconds`, so the columns follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.workedSeconds, board.isToday, board.busyProjectId, board.anyRunning, board.canAct],
  )

  const filters: MyTaskFilter[] = ['all', 'todo', 'in_hand', 'done', 'missed']
  const completingSeconds = board.completing?.kind === 'sop' ? board.workedSeconds(board.completing.row) : undefined
  const viewingSeconds = board.viewing?.kind === 'sop' ? board.workedSeconds(board.viewing.row) : undefined

  const empty = (
    <EmptyState
      icon={CalendarClock}
      title={
        board.filter !== 'all'
          ? 'No task matches this filter'
          : board.isFuture && board.tab === 'sop'
            ? 'Not created yet'
            : 'Nothing scheduled'
      }
      description={
        board.filter !== 'all'
          ? 'Pick another status above.'
          : board.isFuture && board.tab === 'sop'
            ? 'SOP tasks for a day are created on that day.'
            : 'No tasks for this day.'
      }
    />
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Tasks"
        description="Start, pause and complete your SOP tasks; record progress on project tasks."
      />

      {board.companyId === null ? (
        <CompanyRequired what="your tasks" />
      ) : (
      <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={board.tab} onValueChange={(v) => board.setTab(v as MyTaskTab)}>
          <TabsList>
            <TabsTrigger value="sop">
              <ClipboardCheck className="mr-1.5 size-4" />
              SOP Tasks
              {board.openSop > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {board.openSop}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="project">
              <FolderKanban className="mr-1.5 size-4" />
              Project Tasks
              {board.openProject > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {board.openProject}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <DayBar
          date={board.date}
          isToday={board.isToday}
          onChange={board.setDate}
          onPrev={board.prevDay}
          onNext={board.nextDay}
          onToday={board.goToday}
          onRefresh={board.refresh}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => board.setFilter(f)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors',
              board.filter === f ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
            )}
          >
            {FILTER_LABELS[f]}
            <span className="ml-1.5 opacity-70">{board.counts[f]}</span>
          </button>
        ))}
      </div>

      {board.isError ? (
        <ScopedDataError error={board.error} fallback="Couldn't load your tasks." what="your tasks" />
      ) : board.tab === 'sop' ? (
        <DataTable
          columns={sopColumns}
          data={board.sopRows}
          isLoading={board.isLoading}
          hidePagination
          maxHeight="60vh"
          searchPlaceholder="Search this day's tasks…"
          itemName="tasks"
          emptyState={empty}
        />
      ) : (
        <DataTable
          columns={projectColumns}
          data={board.projectRows}
          isLoading={board.isLoading}
          hidePagination
          maxHeight="60vh"
          searchPlaceholder="Search this day's tasks…"
          itemName="tasks"
          emptyState={empty}
        />
      )}

      </>
      )}

      <CompleteTaskDialog target={board.completing} workedSeconds={completingSeconds} onClose={board.closeComplete} />
      <ProgressDialog row={board.recording} onClose={board.closeProgress} />
      <TaskDetailDialog target={board.viewing} workedSeconds={viewingSeconds} onClose={board.closeView} />
    </div>
  )
}
