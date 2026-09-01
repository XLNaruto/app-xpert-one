import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Crown,
  Paperclip,
  Plus,
  Split,
  Wallet,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FilterBar } from '@/components/common/filter-bar'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { cn, formatDate } from '@/lib/utils'
import { useMediaUrl } from '@/hooks/use-media-url'
import { ScopedDataError } from '@/features/company'
import { LEAVE_PAY_TYPE_FILTER_OPTIONS, LEAVE_SORT, LEAVE_TABS } from '../constants'
import { useLeaveList } from '../hooks/use-leave-list'
import { describeGroupSpan, formatDays, formatSplit } from '../lib/leave-summary'
import { LeaveDecisionDialog } from '../components/leave-decision-dialog'
import { LeaveEmployeeCell } from '../components/leave-employee-cell'
import type { LeaveGroup } from '../types'

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
 * **One line per APPLICATION, not per stored row.** Nobody picks paid or unpaid: a
 * leave type carries its own yearly paid allowance, the server spends what's left
 * of it, and the rest of the range is unpaid — which stores the application as two
 * rows sharing an `applicationRef`. The endpoint answers those rows; this screen
 * folds them back into the one thing that was filed, and the Paid / Unpaid column
 * shows how the days fell on either side of the allowance.
 *
 * Approve and Reject are driven by the row's own `canDecide`, NOT by the
 * permission code. Since the leave approval hierarchy landed, `leaves:update`
 * only says you may work a leave desk — not that this particular application is
 * yours. A row on somebody else's level answers a decision with a 403 naming that
 * level, so the buttons go rather than sit there waiting to fail.
 *
 * They still open a dialog, because a decision needs a remark the employee will
 * read (required on a rejection), covers the whole application, and can't be
 * undone.
 */
export function LeaveListPage() {
  const leave = useLeaveList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.leaves)

  const columns = useMemo<ColumnDef<LeaveGroup>[]>(
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
              `canDecide` is the row's own answer to "may YOU decide this one",
              and it is false on every already-decided row as well as on any row
              standing at another level of the approval chain. The permission is
              still checked alongside it: it says whether this user works a leave
              desk at all, which is a different question.
            */}
            {canUpdate && row.original.canDecide && (
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
          <DataTableColumnHeader column={column} title="Paid / Unpaid" />
        ),
        meta: { className: 'whitespace-nowrap' },
        /*
          A single badge can't tell the truth about a split application: the days
          fall on BOTH sides of the allowance. So the cell shows the breakdown,
          and flags the split — the desk needs to know part of what was filed is
          unpaid, because payroll will read it that way.
        */
        cell: ({ row }) => {
          const { paidDays, unpaidDays, split } = row.original
          return (
            <div className="flex items-center gap-1.5">
              {paidDays > 0 && <Badge variant="default">{formatDays(paidDays)} paid</Badge>}
              {unpaidDays > 0 && (
                <Badge variant="warning">{formatDays(unpaidDays)} unpaid</Badge>
              )}
              {paidDays === 0 && unpaidDays === 0 && (
                <span className="text-muted-foreground">—</span>
              )}
              {split && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help text-warning">
                      <Split className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72 text-pretty font-normal">
                    One application, split by the allowance: the leave type's paid
                    days ran out inside the range, so the rest is unpaid. It is
                    approved, rejected and removed as one.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        },
      },
      {
        id: LEAVE_SORT.leaveType,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Leave Type" />
        ),
        meta: { className: 'min-w-40 whitespace-nowrap' },
        /*
          `leaveType` is the name AS FILED — a snapshot that survives a rename or a
          deletion of the master row, which is what makes the register readable
          months later. The catalog's current name is only the fallback.
        */
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.leaveType || row.original.leaveTypeName || '—'}
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
        id: 'pendingWith',
        header: 'Pending With',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        // Who the row is with, which is not the same question as whether the
        // reader may decide it — an owner sees "HR" here on a row they can clear
        // themselves, and still sees the buttons on one that is with NOBODY. A
        // decided row is with nobody in the other sense: there is no decision left.
        cell: ({ row }) => {
          const { pendingWithNobody, pendingWithOwner, pendingWithRole } = row.original
          /*
            No level reaches this company and the owner has opted OUT of the
            chain, so this leave has no approver at all. It is an error state, not
            a queue: it can only have happened after the opt-out, when a level
            stopped resolving, and nothing else on this screen would explain why
            the row is sitting still.
          */
          if (pendingWithNobody) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help">
                    <Badge variant="destructive">
                      <AlertTriangle className="mr-1 size-3" />
                      No approver
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-pretty font-normal">
                  No level of the approval hierarchy reaches this employee's
                  company and the account owner is not in the chain, so nobody is
                  routed this leave. Fix it in Hierarchy Management → Leave.
                </TooltipContent>
              </Tooltip>
            )
          }
          if (pendingWithOwner) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help">
                    <Badge variant="warning">
                      <Crown className="mr-1 size-3" />
                      Account owner
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-pretty font-normal">
                  No level of the approval hierarchy reaches this employee's
                  company, so the leave falls to the account owner.
                </TooltipContent>
              </Tooltip>
            )
          }
          if (pendingWithRole) return <Badge variant="secondary">{pendingWithRole}</Badge>
          return <span className="text-muted-foreground">—</span>
        },
      },
      {
        id: 'reason',
        header: 'Reason',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{row.original.leaveReason || '—'}</span>
            {row.original.attachment && <AttachmentLink attachment={row.original.attachment} />}
          </div>
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
            {canCreate && (
              <Button onClick={leave.goToCreate}>
                <Plus className="size-4" />
                Add Leave
              </Button>
            )}
          </div>
        }
      />

      {/*
        "Pending with me" sits beside the status tabs rather than replacing them:
        it answers a different question (whose desk is this on) from the statuses
        (what happened to it), and the plain list is deliberately unchanged —
        visibility is not routing.
      */}
      <div className="mb-4 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {LEAVE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => leave.changeStatusFilter(tab.value)}
            aria-pressed={leave.statusFilter === tab.value}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              leave.statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {leave.isError ? (
        <ScopedDataError
          error={leave.error}
          fallback="Couldn't load the leave records."
          what="leave records"
        />
      ) : (
        <DataTable
          columns={columns}
          data={leave.rows}
          isLoading={leave.isLoading}
          itemName="leave records"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={leave.limit}
          offset={leave.offset}
          total={leave.total}
          onPaginationChange={leave.onPaginationChange}
          searchValue={leave.search}
          onSearchChange={leave.setSearch}
          /*
            Pay type lives in the Filters panel with the search box, not as a
            loose dropdown: it is a view filter, not a choice — `pay_type` is
            decided by the server from what was left of the leave type's
            allowance, and "unpaid only" answers "what will payroll deduct".
            The status tabs stay outside, above the table: they are the view.
          */
          toolbar={
            <FilterBar
              search={{
                value: leave.search,
                onChange: leave.setSearch,
                placeholder: 'Search leaves…',
              }}
              facets={[
                {
                  key: 'payType',
                  label: 'Paid / unpaid',
                  icon: Wallet,
                  value: leave.payTypeFilter,
                  onChange: leave.changePayTypeFilter,
                  options: LEAVE_PAY_TYPE_FILTER_OPTIONS,
                  searchable: false,
                  // '' is "both" — the API simply gets no `pay_type`.
                  clearValue: '',
                },
              ]}
              onReset={leave.resetFilters}
            />
          }
          manualSorting
          sorting={leave.sorting}
          onSortingChange={leave.onSortingChange}
          emptyState={
            <EmptyState
              icon={CalendarDays}
              title={
                leave.search
                  ? 'No matching leave records'
                  : leave.isMyQueue
                    ? 'Nothing waiting on you'
                    : 'No leave recorded yet'
              }
              description={
                leave.search
                  ? 'Try a different search term.'
                  : leave.isMyQueue
                    ? 'No pending leave is standing at your level of the approval hierarchy.'
                    : 'Record a leave against an employee to get started.'
              }
              action={
                leave.search || leave.isMyQueue
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
        leave={leave.deciding?.leave}
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
        // A delete removes the WHOLE application, both halves of a split — so the
        // warning names every day it takes with it, not just the row that was
        // clicked.
        description={
          leave.pendingDelete
            ? `This will remove ${describeGroupSpan(leave.pendingDelete)} from ${formatDate(leave.pendingDelete.fromDate)}${
                leave.pendingDelete.toDate &&
                leave.pendingDelete.toDate !== leave.pendingDelete.fromDate
                  ? ` to ${formatDate(leave.pendingDelete.toDate)}`
                  : ''
              }${
                leave.pendingDelete.split
                  ? ` — the application was split into a paid and an unpaid part (${formatSplit(leave.pendingDelete)}) and both go together`
                  : ''
              }, and those days will stop counting as leave on the attendance calendar.`
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

/** The proof file on a leave, opened in a new tab. */
function AttachmentLink({ attachment }: { attachment: string }) {
  const url = useMediaUrl(attachment)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open the attached proof"
          className="inline-flex text-muted-foreground transition-colors hover:text-primary"
        >
          <Paperclip className="size-3.5" />
        </a>
      </TooltipTrigger>
      <TooltipContent>Open the attached proof</TooltipContent>
    </Tooltip>
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
