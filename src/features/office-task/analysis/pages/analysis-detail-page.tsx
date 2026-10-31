import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { parseISO } from 'date-fns'
import {
  AlarmClockOff,
  ArrowLeft,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  Timer,
  TimerReset,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendLineChart } from '@/components/charts'
import { DataTable, rowNumber } from '@/components/data-table'
import { decryptParams } from '@/lib/crypto'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { ScopedDataError } from '@/features/company'
import {
  formatDuration,
  PriorityBadge,
  ProgressBar,
  TaskStatusBadge,
  VerdictBadge,
} from '@/features/office-task/common'
import { PROJECT_TASK_TABS, SOP_RUN_TABS } from '../constants'
import { useAnalysisDetail } from '../hooks/use-analysis-detail'
import { employeeSubtitle } from '../lib/analysis-mappers'
import type {
  AnalysisDetailParams,
  AnalysisKind,
  ProjectTaskRow,
  SopChecklistBreakdown,
  SopRunRow,
} from '../types'

function RateCell({ percent }: { percent: number }) {
  return (
    <div className="flex min-w-28 items-center gap-2">
      <ProgressBar percent={percent} />
      <span className="w-9 text-right text-sm font-medium tabular-nums">{percent}%</span>
    </div>
  )
}

function AlertCount({ value }: { value: number }) {
  return (
    <span className={cn('tabular-nums', value > 0 ? 'font-medium text-destructive' : 'text-muted-foreground')}>
      {value}
    </span>
  )
}

/** A task or checklist name — wraps to two lines at most, the full text on hover. */
function TaskName({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className="line-clamp-2 font-medium break-words">{name}</p>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{name}</TooltipContent>
    </Tooltip>
  )
}

function serialColumn<T>(): ColumnDef<T> {
  return {
    id: 'serial',
    header: 'Sr No.',
    enableSorting: false,
    meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
    cell: ({ row, table }) => (
      <span className="text-sm text-muted-foreground tabular-nums">{rowNumber(row, table)}</span>
    ),
  }
}

/** Status pills with counts, over a detail table. */
function StatusTabs<T extends string>({
  tabs,
  value,
  counts,
  onChange,
}: {
  tabs: { value: T; label: string }[]
  value: T
  counts?: Record<T, number>
  onChange: (value: T) => void
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            'cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors',
            value === t.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
          )}
        >
          {t.label}
          <span className="ml-1.5 opacity-70">{counts?.[t.value] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** One employee's Task Analysis — their SOP runs or project work over a window, in depth. */
export function AnalysisDetailPage({ data }: { data?: string }) {
  const params = data ? decryptParams<Partial<AnalysisDetailParams>>(data) : null
  const detail = useAnalysisDetail(params)

  const checklistColumns = useMemo<ColumnDef<SopChecklistBreakdown>[]>(
    () => [
      serialColumn<SopChecklistBreakdown>(),
      {
        id: 'name',
        meta: { className: 'min-w-48 max-w-80' },
        header: 'Checklist',
        enableSorting: false,
        cell: ({ row }) => <TaskName name={row.original.name} />,
      },
      { id: 'runs', header: 'Total Tasks', enableSorting: false, meta: { className: 'whitespace-nowrap' }, cell: ({ row }) => row.original.runs },
      {
        id: 'completed',
        meta: { className: 'whitespace-nowrap' },
        header: 'Done Tasks',
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium text-success tabular-nums">{row.original.completed}</span>,
      },
      { id: 'missed', header: 'Missed Tasks', enableSorting: false, meta: { className: 'whitespace-nowrap' }, cell: ({ row }) => <AlertCount value={row.original.missed} /> },
      { id: 'late', header: 'Late Tasks', enableSorting: false, meta: { className: 'whitespace-nowrap' }, cell: ({ row }) => <AlertCount value={row.original.late} /> },
      {
        id: 'completionRate',
        meta: { className: 'whitespace-nowrap' },
        header: 'Completion',
        enableSorting: false,
        cell: ({ row }) => <RateCell percent={row.original.completionRate} />,
      },
    ],
    [],
  )

  const runColumns = useMemo<ColumnDef<SopRunRow>[]>(
    () => [
      serialColumn<SopRunRow>(),
      {
        id: 'date',
        meta: { className: 'whitespace-nowrap' },
        header: 'Date',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.date)}</span>,
      },
      {
        id: 'task',
        meta: { className: 'min-w-56 max-w-80' },
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <TaskName name={row.original.task} />
            <p className="text-xs text-muted-foreground">
              {row.original.checklist}
              {row.original.slot > 1 && ` · Run ${row.original.slot}`}
            </p>
          </div>
        ),
      },
      {
        id: 'status',
        meta: { className: 'whitespace-nowrap' },
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <TaskStatusBadge status={row.original.status} />
            {row.original.late && <p className="mt-1 text-xs font-medium text-destructive">Handed in late</p>}
          </div>
        ),
      },
      {
        id: 'submitted',
        meta: { className: 'whitespace-nowrap' },
        header: 'Submitted',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            <p>{formatDateTime(row.original.submittedAt)}</p>
            {row.original.workedSeconds > 0 && (
              <p className="text-xs text-muted-foreground">{formatDuration(row.original.workedSeconds)}</p>
            )}
          </div>
        ),
      },
      {
        id: 'verdict',
        meta: { className: 'whitespace-nowrap' },
        header: 'Approval',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.needsApproval && (row.original.verdict || row.original.status === 'pending_approval') ? (
            <VerdictBadge verdict={row.original.verdict} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  )

  const taskColumns = useMemo<ColumnDef<ProjectTaskRow>[]>(
    () => [
      serialColumn<ProjectTaskRow>(),
      {
        id: 'task',
        meta: { className: 'min-w-56 max-w-80' },
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="space-y-1">
            <TaskName name={row.original.task} />
            <PriorityBadge priority={row.original.priority} />
          </div>
        ),
      },
      {
        id: 'status',
        meta: { className: 'whitespace-nowrap' },
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <TaskStatusBadge status={row.original.status} />
            {row.original.overdue && <p className="mt-1 text-xs font-medium text-destructive">Overdue</p>}
            {row.original.finishedLate && <p className="mt-1 text-xs font-medium text-destructive">Finished late</p>}
          </div>
        ),
      },
      {
        id: 'dates',
        meta: { className: 'whitespace-nowrap' },
        header: 'Start → Deadline',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            <p>
              {formatDate(row.original.startDate)} → {formatDate(row.original.deadline)}
            </p>
            {row.original.completedAt && (
              <p className="text-xs text-muted-foreground">Completed {formatDate(row.original.completedAt)}</p>
            )}
          </div>
        ),
      },
      {
        id: 'progress',
        meta: { className: 'whitespace-nowrap' },
        header: 'Progress',
        enableSorting: false,
        cell: ({ row }) => <RateCell percent={row.original.progress} />,
      },
      {
        id: 'updates',
        meta: { className: 'whitespace-nowrap' },
        header: 'Updates',
        enableSorting: false,
        cell: ({ row }) => <span className="tabular-nums">{row.original.updates}</span>,
      },
      {
        id: 'workedSeconds',
        meta: { className: 'whitespace-nowrap' },
        header: 'Time Worked',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDuration(row.original.workedSeconds)}</span>,
      },
    ],
    [],
  )

  const back = (
    <Button variant="outline" onClick={detail.goBack}>
      <ArrowLeft className="size-4" />
      Back
    </Button>
  )

  if (detail.notFound || (detail.error && !detail.employee)) {
    return (
      <div>
        <PageHeader title="Employee Analysis" actions={back} />
        {detail.error ? (
          <ScopedDataError error={detail.error} fallback="Couldn't load this employee's analysis." what="task analysis" />
        ) : (
          <EmptyState title="Not Found" description="This Employee May Have No Tasks in the Window." />
        )}
      </div>
    )
  }

  const sop = detail.kind === 'sop' ? detail.sop : undefined
  const project = detail.kind === 'project' ? detail.project : undefined

  const stats = sop
    ? [
        { label: 'Total Tasks', value: sop.summary.assigned, icon: ClipboardList, hint: `${sop.summary.checklists} checklists` },
        { label: 'Done Tasks', value: sop.summary.completed, icon: CircleCheck, hint: `${sop.summary.completionRate}% completion` },
        { label: 'Missed Tasks', value: sop.summary.missed, icon: AlarmClockOff, hint: `${sop.summary.pending} pending · ${sop.summary.pendingApproval} awaiting` },
        { label: 'On Time', value: `${sop.summary.onTimeRate}%`, icon: TimerReset, hint: `${sop.summary.late} handed in late` },
        { label: 'Time Worked', value: formatDuration(sop.summary.workedSeconds), icon: Timer, hint: `${sop.summary.approved} approved · ${sop.summary.rejected} rejected` },
      ]
    : project
      ? [
          { label: 'Total Tasks', value: project.summary.assigned, icon: ClipboardList, hint: `${project.summary.notStarted} not started` },
          { label: 'Done Tasks', value: project.summary.completed, icon: CircleCheck, hint: `${project.summary.completionRate}% completion` },
          { label: 'Overdue Tasks', value: project.summary.overdue, icon: AlarmClockOff, hint: `${project.summary.inProgress} in progress` },
          { label: 'On Time', value: `${project.summary.onTimeRate}%`, icon: TimerReset, hint: `${project.summary.finishedLate} finished late` },
          { label: 'Time Worked', value: formatDuration(project.summary.workedSeconds), icon: Timer, hint: `${project.summary.updateCompliance}% daily updates` },
        ]
      : null

  return (
    <div className="space-y-4">
      <PageHeader
        title={detail.employee?.employeeName || 'Employee Analysis'}
        description={
          detail.employee ? employeeSubtitle(detail.employee) : undefined
        }
        actions={back}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={detail.kind} onValueChange={(v) => detail.setKind(v as AnalysisKind)}>
          <TabsList>
            <TabsTrigger value="sop">
              <ClipboardCheck className="mr-1.5 size-4" />
              SOP Tasks
            </TabsTrigger>
            <TabsTrigger value="project">
              <FolderKanban className="mr-1.5 size-4" />
              Project Tasks
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <DatePicker
            value={detail.range.from}
            onChange={(v) => v && detail.changeRange({ from: v })}
            maxDate={parseISO(detail.range.to)}
            clearable={false}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <DatePicker
            value={detail.range.to}
            onChange={(v) => v && detail.changeRange({ to: v })}
            minDate={parseISO(detail.range.from)}
            clearable={false}
            className="w-40"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats
          ? stats.map((s) => <StatCard key={s.label} {...s} />)
          : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-30 w-full" />)}
      </div>

      {detail.isLoading || (!sop && !project) ? (
        <div className="space-y-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : sop ? (
        <>
          <Panel title="By Checklist" description="How Each Assigned Checklist Is Going.">
            <DataTable
              columns={checklistColumns}
              data={detail.checklists.rows}
              isLoading={detail.checklists.isLoading}
              itemName="checklists"
              pageSizeOptions={[5, 10, 25, 50]}
              serverPagination
              limit={detail.checklists.limit}
              offset={detail.checklists.offset}
              total={detail.checklists.total}
              onPaginationChange={detail.checklists.onPaginationChange}
              searchPlaceholder="Search…"
              searchValue={detail.checklists.search}
              onSearchChange={detail.checklists.setSearch}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title={detail.checklists.search.trim() ? 'No Matching Checklists' : 'No Checklists in the Window'}
                />
              }
            />
          </Panel>
          <Panel title="SOP Tasks" description="Every Checklist Run In the Window, Newest First.">
            <StatusTabs tabs={SOP_RUN_TABS} value={detail.runs.tab} counts={detail.runs.counts} onChange={detail.runs.setTab} />
            <DataTable
              columns={runColumns}
              data={detail.runs.rows}
              isLoading={detail.runs.isLoading}
              itemName="tasks"
              pageSizeOptions={[5, 10, 25, 50]}
              serverPagination
              limit={detail.runs.limit}
              offset={detail.runs.offset}
              total={detail.runs.total}
              onPaginationChange={detail.runs.onPaginationChange}
              searchPlaceholder="Search…"
              searchValue={detail.runs.search}
              onSearchChange={detail.runs.setSearch}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title={detail.runs.search.trim() ? 'No Matching Tasks' : 'No Tasks in This Tab'}
                />
              }
            />
          </Panel>
        </>
      ) : project ? (
        <>
          <Panel title="Daily Activity" description="Progress Updates Posted and Hours Worked Each Day.">
            <TrendLineChart
              data={project.daily}
              xKey="label"
              series={[
                { key: 'hours', label: 'Hours' },
                { key: 'updates', label: 'Updates' },
              ]}
              height={260}
            />
          </Panel>
          <Panel title="Project Tasks" description="Every Project Task This Employee Holds in the Window.">
            <StatusTabs
              tabs={PROJECT_TASK_TABS}
              value={detail.tasks.tab}
              counts={detail.tasks.counts}
              onChange={detail.tasks.setTab}
            />
            <DataTable
              columns={taskColumns}
              data={detail.tasks.rows}
              isLoading={detail.tasks.isLoading}
              itemName="tasks"
              pageSizeOptions={[5, 10, 25, 50]}
              serverPagination
              limit={detail.tasks.limit}
              offset={detail.tasks.offset}
              total={detail.tasks.total}
              onPaginationChange={detail.tasks.onPaginationChange}
              searchPlaceholder="Search…"
              searchValue={detail.tasks.search}
              onSearchChange={detail.tasks.setSearch}
              emptyState={
                <EmptyState
                  icon={FolderKanban}
                  title={detail.tasks.search.trim() ? 'No Matching Tasks' : 'No Tasks in This Tab'}
                />
              }
            />
          </Panel>
        </>
      ) : null}
    </div>
  )
}
