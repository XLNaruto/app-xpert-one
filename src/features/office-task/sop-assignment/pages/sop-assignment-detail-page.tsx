import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { parseISO } from 'date-fns'
import { ArrowLeft, CalendarRange, CirclePlay, CircleStop, ClipboardList, Trash2, UserRound } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/common/page-header'
import { DetailItem } from '@/components/common/detail-item'
import { EmptyState } from '@/components/common/empty-state'
import { FilterBar } from '@/components/common/filter-bar'
import { DataTable } from '@/components/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScopedDataError } from '@/features/company'
import {
  dayLabel,
  formatDuration,
  frequencyLabel,
  RuleIcons,
  TaskStatusBadge,
  VerdictBadge,
  type SopTask,
} from '@/features/office-task/common'
import { useSopAssignmentDetail } from '../hooks/use-sop-assignment-detail'
import type { SopAssignmentItem } from '../types'
import { AssignmentActionDialog } from '../components/assignment-action-dialog'

/** One employee's assignment: what they hold, for how long, and recent runs. */
export function SopAssignmentDetailPage({ data }: { data?: string }) {
  const { assignment: a, isLoading, notFound, error, access, actions, goToList, items, runs } =
    useSopAssignmentDetail(decryptId(data))

  const itemColumns = useMemo<ColumnDef<SopAssignmentItem>[]>(
    () => [
      {
        id: 'no',
        header: '#',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
      },
      {
        id: 'task',
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) => (
          <>
            <p className="font-medium">
              {row.original.task}
              {row.original.custom && (
                <Badge className="ml-2 border-transparent bg-violet-500/15 text-violet-600 dark:text-violet-400">
                  Custom
                </Badge>
              )}
            </p>
            {row.original.description && (
              <p className="text-xs text-muted-foreground">{row.original.description}</p>
            )}
          </>
        ),
      },
      {
        id: 'frequency',
        header: 'Times per Day',
        enableSorting: false,
        cell: ({ row }) => frequencyLabel(row.original.frequency),
      },
      {
        id: 'rules',
        header: 'Rules',
        enableSorting: false,
        cell: ({ row }) => <RuleIcons photo={row.original.photoRequired} approval={row.original.needsApproval} />,
      },
      {
        id: 'todayStatus',
        header: "Today's Status",
        enableSorting: false,
        cell: ({ row }) => {
          const today = row.original.today
          if (!today) return <span className="text-xs text-muted-foreground">Not due today</span>
          return (
            <div className="flex items-center gap-1.5">
              <TaskStatusBadge status={today.status} paused={today.paused} />
              {today.total > 1 && (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {today.done}/{today.total} done
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'worked',
        header: 'Total Time Logged',
        enableSorting: false,
        cell: ({ row }) => <span className="tabular-nums">{formatDuration(row.original.workedSeconds)}</span>,
      },
    ],
    [],
  )

  const runColumns = useMemo<ColumnDef<SopTask>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{dayLabel(row.original.date)}</span>,
      },
      {
        id: 'task',
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) => (
          <>
            {row.original.task}
            {row.original.slots > 1 && (
              <span className="ml-1 text-xs text-muted-foreground">
                (run {row.original.slot} of {row.original.slots})
              </span>
            )}
          </>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
      },
      {
        id: 'worked',
        header: 'Time Worked',
        enableSorting: false,
        cell: ({ row }) => formatDuration(row.original.workedSeconds),
      },
      {
        id: 'approval',
        header: 'Approval',
        enableSorting: false,
        cell: ({ row }) => {
          const t = row.original
          if (!t.needsApproval) return <span className="text-xs text-muted-foreground">Not required</span>
          return t.status === 'pending_approval' || t.verdict ? <VerdictBadge verdict={t.verdict} /> : '—'
        },
      },
    ],
    [],
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

  if (notFound || !a) {
    return (
      <div>
        <PageHeader title="Assignment" actions={back} />
        {error ? (
          <ScopedDataError error={error} fallback="Assignment not found." what="SOP assignments" />
        ) : (
          <EmptyState title="Assignment not found" description="It may have been deleted." />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.employeeName}
        description={`${a.templateName} · ${a.departmentName}`}
        actions={
          <>
            {back}
            {access.canUpdate &&
              (a.status === 'active' ? (
                <Button variant="outline" onClick={() => actions.askStop(a)}>
                  <CircleStop className="size-4" />
                  Stop
                </Button>
              ) : (
                <Button variant="outline" onClick={() => actions.askStart(a)}>
                  <CirclePlay className="size-4" />
                  Start
                </Button>
              ))}
            {/* Gone once anyone has started work on it (R8) — Stop keeps the history. */}
            {access.canDelete && a.canDelete && (
              <Button variant="destructive" onClick={() => actions.askDelete(a)}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-5 pt-6 md:grid-cols-3 xl:grid-cols-6">
          <DetailItem icon={UserRound} label="Employee" value={a.employeeCode ? `${a.employeeName} (${a.employeeCode})` : a.employeeName} />
          <DetailItem label="Designation" value={a.designationName} />
          <DetailItem icon={ClipboardList} label="SOP Group" value={a.templateName} />
          <DetailItem
            icon={CalendarRange}
            label="Period"
            value={`${formatDate(a.effectiveFrom)} → ${a.effectiveTo ? formatDate(a.effectiveTo) : 'Ongoing'}`}
          />
          <DetailItem label="Tasks / Day" value={String(a.tasksPerDay)} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="mt-1">
              {a.status === 'active' ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Stopped</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Assigned Items</h2>
        {items.error ? (
          <ScopedDataError error={items.error} fallback="Couldn't load the assigned items." what="SOP assignments" />
        ) : (
          <DataTable
            columns={itemColumns}
            data={items.rows}
            isLoading={items.isLoading}
            itemName="items"
            pageSizeOptions={[5, 10, 25, 50]}
          />
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Task History</h2>
        <DataTable
          columns={runColumns}
          data={runs.rows}
          isLoading={runs.isLoading}
          itemName="tasks"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={runs.limit}
          offset={runs.offset}
          total={runs.total}
          onPaginationChange={runs.onPaginationChange}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No tasks in this range"
              description="Tasks are created from the effective date — pick other dates."
            />
          }
          toolbar={
            <FilterBar
              search={{ value: runs.search, onChange: runs.setSearch, placeholder: 'Search task…' }}
              leading={
                <div className="flex items-center gap-2">
                  <DatePicker
                    value={runs.range.from}
                    onChange={(v) => v && runs.changeRange({ from: v })}
                    maxDate={parseISO(runs.range.to)}
                    clearable={false}
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <DatePicker
                    value={runs.range.to}
                    onChange={(v) => v && runs.changeRange({ to: v })}
                    minDate={parseISO(runs.range.from)}
                    maxDate={new Date()}
                    clearable={false}
                    className="w-40"
                  />
                </div>
              }
              onReset={runs.resetFilters}
            />
          }
        />
      </div>

      <AssignmentActionDialog actions={actions} />
    </div>
  )
}
