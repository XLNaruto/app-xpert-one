import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { parseISO } from 'date-fns'
import { Building2, Check, ClipboardCheck, FolderKanban, ShieldCheck, UserCog, UserRound, X } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { FilterBar } from '@/components/common/filter-bar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import {
  formatDuration,
  PriorityBadge,
  ProofStrip,
  TaskStatusBadge,
  VerdictBadge,
  type VerdictInfo,
} from '@/features/office-task/common'
import { APPROVAL_SORT, APPROVAL_TABS } from '../constants'
import { isAnswerable, useApprovalList } from '../hooks/use-approval-list'
import { VerdictDialog } from '../components/verdict-dialog'
import type {
  ApprovalKind,
  ApprovalTab,
  ProjectApprovalRow,
  SopApprovalRow,
} from '../types'

function VerdictCell({ row }: { row: VerdictInfo & { status: string } }) {
  if (!row.verdict && row.status !== 'pending_approval') return <span className="text-muted-foreground">—</span>
  return (
    <div className="space-y-1">
      <VerdictBadge verdict={row.verdict} />
      {row.verdictBy && <p className="text-xs text-muted-foreground">by {row.verdictBy}</p>}
      {row.verdictRemarks && (
        <p className="line-clamp-2 max-w-44 text-xs italic text-muted-foreground">“{row.verdictRemarks}”</p>
      )}
    </div>
  )
}

function AnswerButtons({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Approve"
            onClick={onApprove}
            className="grid size-8 cursor-pointer place-items-center rounded-lg bg-success/12 text-success hover:bg-success/20"
          >
            <Check className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Approve</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Reject"
            onClick={onReject}
            className="grid size-8 cursor-pointer place-items-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <X className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Reject</TooltipContent>
      </Tooltip>
    </div>
  )
}

/** Task Approval — sign off (or send back) SOP runs and project hand-ins. */
export function ApprovalListPage() {
  const list = useApprovalList()

  /** The checkbox column both kinds share. */
  const selectColumn = <T extends { id: number; status: string; verdict: string | null }>(): ColumnDef<T> => ({
    id: 'select',
    enableSorting: false,
    meta: { className: 'w-px' },
    header: () => (
      <Checkbox
        aria-label="Select all"
        checked={list.allChecked}
        indeterminate={list.someChecked}
        onChange={(e) => list.toggleAll(e.target.checked)}
      />
    ),
    cell: ({ row }) =>
      list.canDecide && isAnswerable(row.original) ? (
        <Checkbox
          aria-label="Select row"
          checked={list.selected.has(row.original.id)}
          onChange={(e) => list.toggle(row.original.id, e.target.checked)}
        />
      ) : null,
  })

  const sopColumns = useMemo<ColumnDef<SopApprovalRow>[]>(
    () => [
      selectColumn<SopApprovalRow>(),
      {
        id: 'action',
        header: 'Action',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) =>
          list.canDecide && isAnswerable(row.original) ? (
            <AnswerButtons
              onApprove={() => list.ask('approved', row.original)}
              onReject={() => list.ask('rejected', row.original)}
            />
          ) : null,
      },
      {
        id: 'task',
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="max-w-64">
            <p className="font-medium">{row.original.task}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.templateName}
              {row.original.slots > 1 && ` · Run ${row.original.slot} of ${row.original.slots}`}
            </p>
          </div>
        ),
      },
      {
        id: APPROVAL_SORT.employeeName,
        accessorKey: 'employeeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.original.departmentName}</p>
          </div>
        ),
      },
      {
        id: APPROVAL_SORT.date,
        accessorKey: 'date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.date)}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
      },
      {
        id: 'submitted',
        header: 'Submitted',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            <p>{formatDateTime(row.original.submittedAt)}</p>
            <p className="text-xs text-muted-foreground">{formatDuration(row.original.workedSeconds)}</p>
          </div>
        ),
      },
      {
        id: 'note',
        header: "Worker's Note",
        enableSorting: false,
        cell: ({ row }) => <p className="line-clamp-2 max-w-52 text-sm">{row.original.note || '—'}</p>,
      },
      {
        id: 'proof',
        header: 'Proof',
        enableSorting: false,
        cell: ({ row }) => (
          <ProofStrip files={row.original.proof} required={row.original.photoRequired} max={3} size="sm" />
        ),
      },
      {
        id: 'verdict',
        header: 'Approval',
        enableSorting: false,
        cell: ({ row }) => <VerdictCell row={row.original} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.selected, list.allChecked, list.someChecked, list.sopRows, list.canDecide],
  )

  const projectColumns = useMemo<ColumnDef<ProjectApprovalRow>[]>(
    () => [
      selectColumn<ProjectApprovalRow>(),
      {
        id: 'action',
        header: 'Action',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) =>
          list.canDecide && isAnswerable(row.original) ? (
            <AnswerButtons
              onApprove={() => list.ask('approved', row.original)}
              onReject={() => list.ask('rejected', row.original)}
            />
          ) : null,
      },
      {
        id: 'task',
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="max-w-64 space-y-1">
            <p className="font-medium">{row.original.task}</p>
            <PriorityBadge priority={row.original.priority} />
          </div>
        ),
      },
      {
        id: APPROVAL_SORT.employeeName,
        accessorKey: 'employeeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.original.departmentName}</p>
          </div>
        ),
      },
      {
        id: APPROVAL_SORT.date,
        accessorKey: 'submittedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Submitted" />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            <p>{formatDateTime(row.original.submittedAt)}</p>
            <p className="text-xs text-muted-foreground">Deadline {formatDate(row.original.deadline)}</p>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <TaskStatusBadge status={row.original.status} />
            {row.original.isLate && (
              <p className="mt-1 text-xs font-medium text-destructive">Finished late</p>
            )}
          </div>
        ),
      },
      {
        id: 'note',
        header: "Worker's Note",
        enableSorting: false,
        cell: ({ row }) => <p className="line-clamp-2 max-w-52 text-sm">{row.original.note || '—'}</p>,
      },
      {
        id: 'proof',
        header: 'Proof',
        enableSorting: false,
        cell: ({ row }) => (
          <ProofStrip files={row.original.proof} required={row.original.photoRequired} max={3} size="sm" />
        ),
      },
      {
        id: 'verdict',
        header: 'Verification',
        enableSorting: false,
        cell: ({ row }) => <VerdictCell row={row.original} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.selected, list.allChecked, list.someChecked, list.projectRows, list.canDecide],
  )

  const toolbar = (
    <FilterBar
      search={{ value: list.search, onChange: list.setSearch, placeholder: 'Search task or employee…' }}
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
          options: [{ label: 'All departments', value: '' }, ...list.departmentSelect.options],
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
          options: [{ label: 'All employees', value: '' }, ...list.employeeSelect.options],
          onScrollEnd: list.employeeSelect.onScrollEnd,
          onSearchChange: list.employeeSelect.onSearchChange,
          loading: list.employeeSelect.loading,
          clearValue: '',
        },
        {
          // Role picks go to panel users, who aren't in the employee list.
          key: 'user',
          label: 'Panel User',
          icon: UserCog,
          value: list.filters.userId,
          onChange: (v) => list.changeFilter({ userId: v }),
          options: [{ label: 'All panel users', value: '' }, ...list.userSelect.options],
          onScrollEnd: list.userSelect.onScrollEnd,
          onSearchChange: list.userSelect.onSearchChange,
          loading: list.userSelect.loading,
          clearValue: '',
        },
      ]}
      onReset={list.resetFilters}
    />
  )

  const tableProps = {
    isLoading: list.isLoading,
    itemName: 'tasks',
    pageSizeOptions: [5, 10, 25, 50],
    serverPagination: true,
    limit: list.limit,
    offset: list.offset,
    total: list.total,
    onPaginationChange: list.onPaginationChange,
    manualSorting: true,
    sorting: list.sorting,
    onSortingChange: list.onSortingChange,
    toolbar,
    emptyState: (
      <EmptyState
        icon={ShieldCheck}
        title={list.filters.tab === 'awaiting' ? 'Nothing waiting for you' : 'No tasks found'}
        description="Try a wider date range or another tab."
      />
    ),
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Task Approval"
        description="Review handed-in work and its proof, then approve it or send it back."
      />

      {list.companyId === null ? (
        <CompanyRequired what="task approvals" />
      ) : (
      <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={list.kind} onValueChange={(v) => list.setKind(v as ApprovalKind)}>
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

        <div className="flex flex-wrap gap-2">
          {APPROVAL_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => list.changeFilter({ tab: t.value as ApprovalTab })}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors',
                list.filters.tab === t.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted',
              )}
            >
              {t.label}
              <span className="ml-1.5 opacity-70">{list.counts[t.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {list.selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium">
            {list.selectedCount} task{list.selectedCount === 1 ? '' : 's'} ready for a verdict
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => list.ask('approved')}>
              <Check className="size-4" />
              Approve All
            </Button>
            <Button size="sm" variant="destructive" onClick={() => list.ask('rejected')}>
              <X className="size-4" />
              Reject All
            </Button>
            <Button size="sm" variant="ghost" onClick={list.clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {list.isError ? (
        <ScopedDataError error={list.error} fallback="Couldn't load the approvals." what="task approvals" />
      ) : list.kind === 'sop' ? (
        <DataTable columns={sopColumns} data={list.sopRows} {...tableProps} />
      ) : (
        <DataTable columns={projectColumns} data={list.projectRows} {...tableProps} />
      )}
      </>
      )}

      <VerdictDialog request={list.request} onClose={list.closeRequest} onDone={list.onAnswered} />
    </div>
  )
}
