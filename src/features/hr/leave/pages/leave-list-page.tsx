import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, Check, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { cn, formatDate } from '@/lib/utils'
import { LEAVE_SORT, LEAVE_STATUS_FILTER_OPTIONS } from '../constants'
import { useLeaveList } from '../hooks/use-leave-list'
import { LeaveDecisionDialog } from '../components/leave-decision-dialog'
import { LeaveEmployeeCell } from '../components/leave-employee-cell'
import type { Leave } from '../types'

/** Status → badge colour. */
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'destructive',
}

/**
 * Leave Management — the company-wide leave register.
 *
 * Genuinely server-paged, searched and sorted: the register grows without bound,
 * so the endpoint does the work and the table reports pages back as limit/offset.
 *
 * Approve and Reject appear on pending rows only, and those open a dialog,
 * because a decision needs a remark the employee will read and can't be undone.
 */
export function LeaveListPage() {
  const leave = useLeaveList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.leaves)

  const columns = useMemo<ColumnDef<Leave>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {leave.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/*
              The pair belongs to a pending row only. Once a leave is approved or
              rejected the decision is final — the API answers a second one with a
              400 — so the buttons go rather than sit there greyed out.
            */}
            {canUpdate && row.original.status === 'PENDING' && (
              <>
                <DecisionButton
                  label="Approve"
                  icon={Check}
                  onClick={() => leave.startDecision(row.original, 'APPROVED')}
                  className="bg-success/12 text-success hover:bg-success/20"
                />
                <DecisionButton
                  label="Reject"
                  icon={X}
                  onClick={() => leave.startDecision(row.original, 'REJECTED')}
                  className="bg-warning/15 text-warning hover:bg-warning/25"
                />
              </>
            )}
            <TableRowActions
              onEdit={canUpdate ? () => leave.goToEdit(row.original.id) : undefined}
              onDelete={
                canDelete ? () => leave.setPendingDelete(row.original) : undefined
              }
            />
          </div>
        ),
      },
      {
        id: LEAVE_SORT.employeeName,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        meta: { className: 'min-w-56' },
        cell: ({ row }) => <LeaveEmployeeCell leave={row.original} />,
      },
      {
        // Sortable columns carry the API's own field name as their id.
        id: LEAVE_SORT.fromDate,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="From Date" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.fromDate ? formatDate(row.original.fromDate) : '—',
      },
      {
        id: LEAVE_SORT.toDate,
        header: ({ column }) => <DataTableColumnHeader column={column} title="To Date" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (row.original.toDate ? formatDate(row.original.toDate) : '—'),
      },
      {
        id: LEAVE_SORT.payType,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pay Type" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <Badge variant={row.original.payType === 'PAID' ? 'default' : 'warning'}>
            {row.original.payType}
          </Badge>
        ),
      },
      {
        id: LEAVE_SORT.leaveType,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Leave Type" />
        ),
        meta: { className: 'min-w-40 whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.leaveTypeName || row.original.leaveType || '—'}
          </span>
        ),
      },
      {
        id: LEAVE_SORT.duration,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Duration" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.duration === 'HALF_DAY' ? (
            <span>
              Half day
              {row.original.fromTime && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {row.original.fromTime}–{row.original.toTime}
                </span>
              )}
            </span>
          ) : (
            'Full day'
          ),
      },
      {
        id: LEAVE_SORT.status,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const badge = (
            <Badge variant={STATUS_VARIANT[row.original.status] ?? 'secondary'}>
              {row.original.status}
            </Badge>
          )
          if (!row.original.statusRemark) return badge
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help">{badge}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 font-normal">
                {row.original.statusRemark}
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        id: 'reason',
        header: 'Reason',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.leaveReason || '—'}</span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leave.offset, canUpdate, canDelete],
  )

  if (leave.isForbidden) return <Forbidden description={leave.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Record and decide leave for every employee in the company."
        actions={
          <div className="flex items-center gap-2">
            <Combobox
              className="w-40"
              searchable={false}
              value={leave.statusFilter}
              onChange={leave.changeStatusFilter}
              options={LEAVE_STATUS_FILTER_OPTIONS}
              placeholder="All statuses"
            />
            {canCreate && (
              <Button onClick={leave.goToCreate}>
                <Plus className="size-4" />
                Add Leave
              </Button>
            )}
          </div>
        }
      />

      {leave.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {leave.error instanceof Error
            ? leave.error.message
            : "Couldn't load the leave records."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={leave.rows}
          isLoading={leave.isLoading}
          searchPlaceholder="Search leaves…"
          itemName="leave records"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={leave.limit}
          offset={leave.offset}
          total={leave.total}
          onPaginationChange={leave.onPaginationChange}
          searchValue={leave.search}
          onSearchChange={leave.setSearch}
          manualSorting
          sorting={leave.sorting}
          onSortingChange={leave.onSortingChange}
          emptyState={
            <EmptyState
              icon={CalendarDays}
              title={leave.search ? 'No matching leave records' : 'No leave recorded yet'}
              description={
                leave.search
                  ? 'Try a different search term.'
                  : 'Record a leave against an employee to get started.'
              }
              action={
                leave.search
                  ? undefined
                  : canCreate && (
                      <Button onClick={leave.goToCreate}>
                        <Plus className="size-4" />
                        Add Leave
                      </Button>
                    )
              }
            />
          }
        />
      )}

      <LeaveDecisionDialog
        open={leave.deciding !== null}
        onOpenChange={(open) => !open && leave.closeDecision()}
        status={leave.deciding?.status}
        form={leave.decisionForm}
        onSubmit={leave.onSubmitDecision}
        isPending={leave.isDeciding}
      />

      <ConfirmDialog
        open={leave.pendingDelete !== null}
        onOpenChange={(open) => !open && leave.setPendingDelete(null)}
        variant="destructive"
        icon={CalendarDays}
        title="Remove this leave record?"
        description={
          leave.pendingDelete
            ? `The leave from ${formatDate(leave.pendingDelete.fromDate)} will be removed, and its days will stop counting as leave on the attendance calendar.`
            : undefined
        }
        confirmLabel="Remove"
        loading={leave.isDeleting}
        keepOpenOnConfirm
        onConfirm={leave.confirmDelete}
      />
    </div>
  )
}

/** A soft-tinted square icon button for the approve / reject pair. */
function DecisionButton({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string
  icon: typeof Check
  onClick: () => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            'grid size-8 cursor-pointer place-items-center rounded-lg transition-colors',
            className,
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
