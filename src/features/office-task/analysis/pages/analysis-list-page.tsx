import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { parseISO } from 'date-fns'
import {
  AlarmClockOff,
  BarChart3,
  Building2,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  Timer,
  TimerReset,
  UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { FilterBar } from '@/components/common/filter-bar'
import { StatCard } from '@/components/common/stat-card'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComparisonBarChart, DonutChart } from '@/components/charts'
import { DataTable, DataTableColumnHeader, rowNumber } from '@/components/data-table'
import { cn } from '@/lib/utils'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import { formatDuration, ProgressBar } from '@/features/office-task/common'
import { ANALYSIS_SORT } from '../constants'
import { useAnalysisList } from '../hooks/use-analysis-list'
import { employeeSubtitle } from '../lib/analysis-mappers'
import type { AnalysisKind, ProjectEmployeeAnalysis, SopEmployeeAnalysis } from '../types'

function EmployeeCell({
  row,
}: {
  row: { employeeName: string | null; employeeCode: string | null; departmentName: string | null }
}) {
  return (
    <div className="min-w-40">
      <p className="font-medium">{row.employeeName ?? '—'}</p>
      <p className="text-xs text-muted-foreground">{employeeSubtitle(row)}</p>
    </div>
  )
}

/** A rate as a bar and its number. */
function RateCell({ percent }: { percent: number }) {
  return (
    <div className="flex min-w-28 items-center gap-2">
      <ProgressBar percent={percent} />
      <span className="w-9 text-right text-sm font-medium tabular-nums">{percent}%</span>
    </div>
  )
}

/** A count that is bad news when it isn't zero. */
function AlertCount({ value }: { value: number }) {
  return (
    <span className={cn('tabular-nums', value > 0 ? 'font-medium text-destructive' : 'text-muted-foreground')}>
      {value}
    </span>
  )
}

const num = (value: number) => <span className="tabular-nums">{value}</span>

/** The Sr No. column both tables open with — numbered across pages. */
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

/** The View button that opens one employee's analysis. */
function viewColumn<T extends { employeeId: number }>(onView: (employeeId: number) => void): ColumnDef<T> {
  return {
    id: 'action',
    header: 'Action',
    enableSorting: false,
    meta: { className: 'w-px whitespace-nowrap' },
    cell: ({ row }) => <TableRowActions onView={() => onView(row.original.employeeId)} />,
  }
}

/** Task Analysis — how each employee is doing on SOP checklists and project work. */
export function AnalysisListPage() {
  const list = useAnalysisList()

  const sopColumns = useMemo<ColumnDef<SopEmployeeAnalysis>[]>(
    () => [
      serialColumn<SopEmployeeAnalysis>(),
      viewColumn<SopEmployeeAnalysis>(list.openDetail),
      {
        id: ANALYSIS_SORT.employeeName,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'employeeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
        cell: ({ row }) => <EmployeeCell row={row.original} />,
      },
      {
        id: 'checklists',
        meta: { className: 'whitespace-nowrap' },
        header: 'Checklists',
        enableSorting: false,
        cell: ({ row }) => num(row.original.checklists),
      },
      {
        id: ANALYSIS_SORT.assigned,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'assigned',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total Tasks" />,
        cell: ({ row }) => num(row.original.assigned),
      },
      {
        id: ANALYSIS_SORT.completed,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'completed',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Done Tasks" />,
        cell: ({ row }) => <span className="font-medium text-success tabular-nums">{row.original.completed}</span>,
      },
      {
        id: 'pending',
        meta: { className: 'whitespace-nowrap' },
        header: 'Pending Tasks',
        enableSorting: false,
        cell: ({ row }) => num(row.original.pending),
      },
      {
        id: 'missed',
        meta: { className: 'whitespace-nowrap' },
        header: 'Missed Tasks',
        enableSorting: false,
        cell: ({ row }) => <AlertCount value={row.original.missed} />,
      },
      {
        id: 'late',
        meta: { className: 'whitespace-nowrap' },
        header: 'Late Tasks',
        enableSorting: false,
        cell: ({ row }) => <AlertCount value={row.original.late} />,
      },
      {
        id: 'verdicts',
        meta: { className: 'whitespace-nowrap' },
        header: 'Approved / Rejected Tasks',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            <span className="text-success">{row.original.approved}</span>
            <span className="text-muted-foreground"> / </span>
            <span className={row.original.rejected ? 'text-destructive' : 'text-muted-foreground'}>
              {row.original.rejected}
            </span>
          </span>
        ),
      },
      {
        id: ANALYSIS_SORT.completionRate,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'completionRate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Completion" />,
        cell: ({ row }) => <RateCell percent={row.original.completionRate} />,
      },
      {
        id: ANALYSIS_SORT.onTimeRate,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'onTimeRate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="On Time" />,
        cell: ({ row }) => <RateCell percent={row.original.onTimeRate} />,
      },
      {
        id: ANALYSIS_SORT.workedSeconds,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'workedSeconds',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Time Worked" />,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDuration(row.original.workedSeconds)}</span>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.kind, list.filters],
  )

  const projectColumns = useMemo<ColumnDef<ProjectEmployeeAnalysis>[]>(
    () => [
      serialColumn<ProjectEmployeeAnalysis>(),
      viewColumn<ProjectEmployeeAnalysis>(list.openDetail),
      {
        id: ANALYSIS_SORT.employeeName,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'employeeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
        cell: ({ row }) => <EmployeeCell row={row.original} />,
      },
      {
        id: ANALYSIS_SORT.assigned,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'assigned',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total Tasks" />,
        cell: ({ row }) => num(row.original.assigned),
      },
      {
        id: ANALYSIS_SORT.completed,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'completed',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Done Tasks" />,
        cell: ({ row }) => <span className="font-medium text-success tabular-nums">{row.original.completed}</span>,
      },
      {
        id: 'inProgress',
        meta: { className: 'whitespace-nowrap' },
        header: 'In Progress Tasks',
        enableSorting: false,
        cell: ({ row }) => num(row.original.inProgress),
      },
      {
        id: 'notStarted',
        meta: { className: 'whitespace-nowrap' },
        header: 'Not Started Tasks',
        enableSorting: false,
        cell: ({ row }) => num(row.original.notStarted),
      },
      {
        id: 'pendingApproval',
        meta: { className: 'whitespace-nowrap' },
        header: 'Awaiting Approval Tasks',
        enableSorting: false,
        cell: ({ row }) => num(row.original.pendingApproval),
      },
      {
        id: 'overdue',
        meta: { className: 'whitespace-nowrap' },
        header: 'Overdue Tasks',
        enableSorting: false,
        cell: ({ row }) => <AlertCount value={row.original.overdue} />,
      },
      {
        id: 'finishedLate',
        meta: { className: 'whitespace-nowrap' },
        header: 'Finished Late Tasks',
        enableSorting: false,
        cell: ({ row }) => <AlertCount value={row.original.finishedLate} />,
      },
      {
        id: 'avgProgress',
        meta: { className: 'whitespace-nowrap' },
        header: 'Avg Progress',
        enableSorting: false,
        cell: ({ row }) => <RateCell percent={row.original.avgProgress} />,
      },
      {
        id: 'updateCompliance',
        meta: { className: 'whitespace-nowrap' },
        header: 'Daily Updates',
        enableSorting: false,
        cell: ({ row }) => <RateCell percent={row.original.updateCompliance} />,
      },
      {
        id: ANALYSIS_SORT.completionRate,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'completionRate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Completion" />,
        cell: ({ row }) => <RateCell percent={row.original.completionRate} />,
      },
      {
        id: ANALYSIS_SORT.onTimeRate,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'onTimeRate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="On Time" />,
        cell: ({ row }) => <RateCell percent={row.original.onTimeRate} />,
      },
      {
        id: ANALYSIS_SORT.workedSeconds,
        meta: { className: 'whitespace-nowrap' },
        accessorKey: 'workedSeconds',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Time Worked" />,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDuration(row.original.workedSeconds)}</span>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.kind, list.filters],
  )

  const sop = list.sopSummary
  const project = list.projectSummary

  const stats =
    list.kind === 'sop'
      ? sop && [
          { label: 'Runs Assigned', value: sop.assigned, icon: ClipboardList, hint: `${sop.employees} employees` },
          { label: 'Completed', value: sop.completed, icon: CircleCheck, hint: `${sop.completionRate}% completion` },
          { label: 'Missed', value: sop.missed, icon: AlarmClockOff, hint: `${sop.pending} still pending` },
          { label: 'On Time', value: `${sop.onTimeRate}%`, icon: TimerReset, hint: `${sop.late} handed in late` },
          { label: 'Time Worked', value: formatDuration(sop.workedSeconds), icon: Timer },
        ]
      : project && [
          { label: 'Tasks Assigned', value: project.assigned, icon: ClipboardList, hint: `${project.employees} employees` },
          { label: 'Completed', value: project.completed, icon: CircleCheck, hint: `${project.completionRate}% completion` },
          { label: 'Overdue', value: project.overdue, icon: AlarmClockOff, hint: `${project.inProgress} in progress` },
          { label: 'On Time', value: `${project.onTimeRate}%`, icon: TimerReset, hint: 'of completed tasks' },
          { label: 'Time Worked', value: formatDuration(project.workedSeconds), icon: Timer },
        ]

  const breakdown =
    list.kind === 'sop'
      ? sop && [
          { name: 'Completed', value: sop.completed },
          { name: 'Pending', value: sop.pending },
          // The summary carries no awaiting count — it's whatever the other three leave.
          { name: 'Awaiting Approval', value: Math.max(0, sop.assigned - sop.completed - sop.pending - sop.missed) },
          { name: 'Missed', value: sop.missed },
        ]
      : project && [
          { name: 'Completed', value: project.completed },
          { name: 'In Progress', value: project.inProgress },
          { name: 'Awaiting Approval', value: project.pendingApproval },
          { name: 'Not Started', value: project.notStarted },
        ]

  const rows: (SopEmployeeAnalysis | ProjectEmployeeAnalysis)[] =
    list.kind === 'sop' ? list.sopRows : list.projectRows
  const comparison = rows.map((r) => ({
    name: r.employeeName?.split(' ')[0] ?? r.employeeCode ?? `#${r.employeeId}`,
    completed: r.completed,
    open: r.assigned - r.completed,
  }))

  const toolbar = (
    <FilterBar
      search={{ value: list.search, onChange: list.setSearch, placeholder: 'Search employee…' }}
      leading={
        <div className="flex items-center gap-2">
          <DatePicker
            value={list.filters.from}
            onChange={(v) => v && list.changeFilter({ from: v })}
            maxDate={parseISO(list.filters.to)}
            clearable={false}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <DatePicker
            value={list.filters.to}
            onChange={(v) => v && list.changeFilter({ to: v })}
            minDate={parseISO(list.filters.from)}
            clearable={false}
            className="w-40"
          />
        </div>
      }
      facets={[
        {
          key: 'department',
          label: 'Department',
          icon: Building2,
          value: list.filters.departmentId,
          onChange: (v) => list.changeFilter({ departmentId: v }),
          options: [{ label: 'All Departments', value: '' }, ...list.departmentSelect.options],
          onScrollEnd: list.departmentSelect.onScrollEnd,
          onSearchChange: list.departmentSelect.onSearchChange,
          loading: list.departmentSelect.loading,
          clearValue: '',
        },
        {
          key: 'employee',
          label: 'Employee',
          icon: UserRound,
          value: list.filters.employeeId,
          onChange: (v) => list.changeFilter({ employeeId: v }),
          options: [{ label: 'All Employees', value: '' }, ...list.employeeSelect.options],
          onScrollEnd: list.employeeSelect.onScrollEnd,
          onSearchChange: list.employeeSelect.onSearchChange,
          loading: list.employeeSelect.loading,
          clearValue: '',
        },
      ]}
      onReset={list.resetFilters}
    />
  )

  const tableProps = {
    isLoading: list.isLoading,
    itemName: 'employees',
    pageSizeOptions: [5, 10, 25, 50],
    serverPagination: true,
    limit: list.limit,
    offset: list.offset,
    total: list.total,
    onPaginationChange: list.onPaginationChange,
    manualSorting: true,
    sorting: list.sorting,
    onSortingChange: list.onSortingChange,
    emptyState: (
      <EmptyState icon={BarChart3} title="No Employees Found" description="Try a wider date range or other filters." />
    ),
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Task Analysis"
        description="Employee-wise completion, punctuality and time spent on SOP checklists and project work."
      />

      {list.companyId === null ? (
        <CompanyRequired what="task analysis" />
      ) : (
        <>
          <Tabs value={list.kind} onValueChange={(v) => list.setKind(v as AnalysisKind)}>
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

          {toolbar}

          {list.isError ? (
            <ScopedDataError error={list.error} fallback="Couldn't load the analysis." what="task analysis" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {stats
                  ? stats.map((s) => <StatCard key={s.label} {...s} />)
                  : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-30 w-full" />)}
              </div>

              <div className="grid gap-4 lg:grid-cols-5">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Status Breakdown</CardTitle>
                    <CardDescription>
                      {list.kind === 'sop' ? 'Every SOP run due in the window.' : 'Every project task in the window.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {breakdown ? <DonutChart data={breakdown} height={260} /> : <Skeleton className="h-65 w-full" />}
                  </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Done vs Open</CardTitle>
                    <CardDescription>The employees on this page of the table, in its order — scroll for more.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {list.isLoading ? (
                      <Skeleton className="h-65 w-full" />
                    ) : (
                      <ComparisonBarChart
                        data={comparison}
                        xKey="name"
                        series={[
                          { key: 'completed', label: 'Done' },
                          { key: 'open', label: 'Open' },
                        ]}
                        height={260}
                        minPerItem={72}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {list.kind === 'sop' ? (
                <DataTable columns={sopColumns} data={list.sopRows} {...tableProps} />
              ) : (
                <DataTable columns={projectColumns} data={list.projectRows} {...tableProps} />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
