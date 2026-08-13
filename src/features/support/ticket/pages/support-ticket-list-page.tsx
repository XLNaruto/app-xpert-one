import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle,
  CheckCheck,
  Flame,
  LifeBuoy,
  Plus,
  SignalHigh,
  Timer,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FilterBar } from '@/components/common/filter-bar'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import {
  ALL_FILTER,
  SUPPORT_PRIORITY_OPTIONS,
  SUPPORT_STATUS_OPTIONS,
  SUPPORT_TICKET_SORT,
  SUPPORT_TICKET_TYPE_OPTIONS,
} from '../constants'
import { canClose, canEditWording, canReopen, dueLabel } from '../lib/support-ticket-mappers'
import { useSupportTicketList } from '../hooks/use-support-ticket-list'
import {
  SupportDueBadge,
  SupportPriorityBadge,
  SupportStatusBadge,
  SupportTypeBadge,
} from '../components/support-ticket-badges'
import { SupportTicketReopenDialog } from '../components/support-ticket-reopen-dialog'
import { SupportTicketRowActions } from '../components/support-ticket-row-actions'
import type { SupportTicket } from '../types'

/** The "Open only" facet — a shortcut for the three unfinished statuses at once. */
const OPEN_ONLY_OPTIONS = [
  { label: 'All tickets', value: '' },
  { label: 'Unfinished only', value: 'true' },
]

/**
 * Row-level edit is hidden for now — the edit flow (route, page, `goToEdit`,
 * the `canEditWording` window) stays wired up, so flipping this back to `true`
 * restores the button with no other change.
 */
const SHOW_EDIT_ACTION = false

/**
 * Raise Support — every query this organization has put to the platform desk.
 *
 * A history, not a queue: it opens newest-first rather than in the desk's
 * severity-then-deadline order, because the question this screen answers is
 * "what did we ask, and where has it got to".
 *
 * Tickets belong to the ORGANIZATION, not to whoever typed them, so a colleague
 * can follow one up while its author is away — which is why the raiser is a
 * column rather than an assumption.
 */
export function SupportTicketListPage() {
  const list = useSupportTicketList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate } = useResourceAccess(PERMISSIONS.support)

  const columns = useMemo<ColumnDef<SupportTicket>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {list.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <SupportTicketRowActions
            onView={() => list.goToDetail(row.original.id)}
            // The wording is amendable only until the desk first touches it —
            // after that the API answers 409, so the action isn't offered.
            onEdit={
              SHOW_EDIT_ACTION && canUpdate && canEditWording(row.original)
                ? () => list.goToEdit(row.original.id)
                : undefined
            }
            onReopen={
              canUpdate && canReopen(row.original)
                ? () => list.openReopen(row.original)
                : undefined
            }
            onClose={
              canUpdate && canClose(row.original)
                ? () => list.setPendingClose(row.original)
                : undefined
            }
          />
        ),
      },
      {
        id: 'code',
        accessorKey: 'code',
        header: 'Ticket',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-foreground">
            {row.original.code}
          </span>
        ),
      },
      {
        id: 'subject',
        accessorKey: 'subject',
        header: 'Subject',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="max-w-md">
            <span className="block truncate font-medium text-foreground">
              {row.original.subject}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {row.original.description}
            </span>
          </div>
        ),
      },
      {
        id: 'ticket_type',
        accessorKey: 'ticketType',
        header: 'Desk',
        enableSorting: false,
        cell: ({ row }) => <SupportTypeBadge ticketType={row.original.ticketType} />,
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: SUPPORT_TICKET_SORT.priority,
        accessorKey: 'priority',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Priority" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <SupportPriorityBadge priority={row.original.priority} />
            {/* The desk re-graded it. The deadline still belongs to what we
                raised it with, so both are worth showing. */}
            {row.original.priority !== row.original.raisedPriority && (
              <span className="text-xs text-muted-foreground">
                (raised {row.original.raisedPriority})
              </span>
            )}
          </div>
        ),
      },
      {
        id: SUPPORT_TICKET_SORT.status,
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <SupportStatusBadge status={row.original.status} />,
      },
      {
        id: SUPPORT_TICKET_SORT.dueAt,
        accessorKey: 'dueAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <SupportDueBadge ticket={row.original} label={dueLabel(row.original)} />
        ),
      },
      {
        id: 'raised_by_name',
        accessorKey: 'raisedByName',
        header: 'Raised By',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.raisedByName || '—'}
          </span>
        ),
      },
      {
        id: SUPPORT_TICKET_SORT.createdAt,
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Raised" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.offset, canUpdate],
  )

  if (list.isForbidden) return <Forbidden description={list.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Raise Support"
        description="Your queries to the XpertOne help desk. The desk you pick and how urgent you mark it together set the response time your plan promises — and that deadline is fixed the moment the ticket is raised."
        actions={
          canCreate && (
            <Button onClick={list.goToCreate}>
              <Plus className="size-4" />
              Raise Ticket
            </Button>
          )
        }
      />

      {list.isError ? (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            {getApiErrorMessage(list.error, "Couldn't load your support tickets.")}
          </span>
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={list.rows}
          isLoading={list.isLoading}
          itemName="tickets"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={list.limit}
          offset={list.offset}
          total={list.total}
          onPaginationChange={list.onPaginationChange}
          manualSorting
          sorting={list.sorting}
          onSortingChange={list.onSortingChange}
          toolbar={
            <FilterBar
              search={{
                value: list.search,
                onChange: list.setSearch,
                placeholder: 'Search by ticket code, subject or description…',
              }}
              facets={[
                {
                  key: 'status',
                  label: 'Status',
                  icon: SignalHigh,
                  value: list.filters.status,
                  onChange: list.changeStatus,
                  options: [
                    { label: 'All statuses', value: ALL_FILTER },
                    ...SUPPORT_STATUS_OPTIONS,
                  ],
                  clearValue: ALL_FILTER,
                },
                {
                  // `open_only` is the API's own shortcut for open + in progress
                  // + reopened, which no single `status` value can express.
                  key: 'open_only',
                  label: 'Unfinished',
                  icon: Timer,
                  value: list.filters.openOnly ? 'true' : ALL_FILTER,
                  onChange: list.toggleOpenOnly,
                  options: OPEN_ONLY_OPTIONS,
                  clearValue: ALL_FILTER,
                  searchable: false,
                },
                {
                  key: 'ticket_type',
                  label: 'Desk',
                  icon: LifeBuoy,
                  value: list.filters.ticketType,
                  onChange: (value) => list.setFilter('ticketType', value),
                  options: [
                    { label: 'Both desks', value: ALL_FILTER },
                    ...SUPPORT_TICKET_TYPE_OPTIONS,
                  ],
                  clearValue: ALL_FILTER,
                  searchable: false,
                },
                {
                  key: 'priority',
                  label: 'Priority',
                  icon: Flame,
                  value: list.filters.priority,
                  onChange: (value) => list.setFilter('priority', value),
                  options: [
                    { label: 'Any priority', value: ALL_FILTER },
                    ...SUPPORT_PRIORITY_OPTIONS,
                  ],
                  clearValue: ALL_FILTER,
                  searchable: false,
                },
              ]}
              onReset={list.resetFilters}
            />
          }
          emptyState={
            <EmptyState
              icon={LifeBuoy}
              title={
                list.search || list.hasFilters
                  ? 'No matching tickets'
                  : 'No tickets raised yet'
              }
              description={
                list.search || list.hasFilters
                  ? 'Try a different search term or clear the filters.'
                  : "Stuck on something, or a question about your subscription? Raise a ticket and the help desk picks it up within the time your plan promises."
              }
              action={
                list.search || list.hasFilters
                  ? undefined
                  : canCreate && (
                      <Button onClick={list.goToCreate}>
                        <Plus className="size-4" />
                        Raise Ticket
                      </Button>
                    )
              }
            />
          }
        />
      )}

      <SupportTicketReopenDialog
        ticket={list.pendingReopen}
        open={list.pendingReopen !== null}
        onOpenChange={(open) => !open && list.setPendingReopen(null)}
        reason={list.reopenReason}
        onReasonChange={list.setReopenReason}
        onConfirm={list.confirmReopen}
        loading={list.isReopening}
      />

      <ConfirmDialog
        open={list.pendingClose !== null}
        onOpenChange={(open) => !open && list.setPendingClose(null)}
        icon={CheckCheck}
        title="Close this ticket?"
        description={
          list.pendingClose
            ? `Closing ${list.pendingClose.code} accepts the desk's resolution and files it away. Nothing is deleted, and you can still reopen it later if the fix does not hold.`
            : undefined
        }
        confirmLabel="Close ticket"
        cancelLabel="Cancel"
        loading={list.isClosing}
        keepOpenOnConfirm
        onConfirm={list.confirmClose}
      />
    </div>
  )
}
