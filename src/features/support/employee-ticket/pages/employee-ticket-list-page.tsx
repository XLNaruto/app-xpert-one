import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle,
  Building2,
  Flame,
  Headset,
  Inbox,
  MessagesSquare,
  Tags,
  Timer,
  UserRoundCog,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { FilterBar } from '@/components/common/filter-bar'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { Button } from '@/components/ui/button'
import { PERMISSIONS, useCan } from '@/features/permissions'
import {
  ALL_FILTER,
  EMPLOYEE_TICKET_CATEGORY_OPTIONS,
  EMPLOYEE_TICKET_PRIORITY_OPTIONS,
  EMPLOYEE_TICKET_SORT,
  UNASSIGNED_ONLY_OPTIONS,
} from '../constants'
import {
  ageLabel,
  assigneeLabel,
  assignmentSourceLabel,
  employeeLabel,
  formatDuration,
} from '../lib/employee-ticket-mappers'
import { useEmployeeTicketList } from '../hooks/use-employee-ticket-list'
import {
  EmployeeTicketCategoryBadge,
  EmployeeTicketPickupBadge,
  EmployeeTicketPriorityBadge,
  EmployeeTicketStatusBadge,
  EmployeeTicketWorkingBadge,
} from '../components/employee-ticket-badges'
import type { EmployeeTicket } from '../types'

/** The "unfinished only" facet — a shortcut spanning three of the tabs. */
const OPEN_ONLY_OPTIONS = [
  { label: 'All tickets', value: '' },
  { label: 'Unfinished only', value: 'true' },
]

/**
 * Employee Support — the queue of what our own people have asked us.
 *
 * The mirror image of the Raise Support screen: there we ask the platform, here
 * we answer. Two things follow from that and shape the whole page:
 *
 * - It opens MOST SEVERE first, not newest first. This is work waiting on
 *   somebody, so what hurts most sits at the top.
 * - There is no deadline and nothing overdue. Severity ranks the queue and
 *   nothing else, so "how long has this waited" is answered by the ticket's age
 *   rather than by a clock somebody promised.
 *
 * Nothing auto-assigns either. A ticket arrives belonging to NOBODY and stays
 * there until somebody takes it or is handed it — which is why "needs pickup" is
 * the badge this queue shouts, and why "unassigned only" is its real starting
 * point rather than one more facet.
 */
export function EmployeeTicketListPage() {
  const list = useEmployeeTicketList()

  /** Opening a thread is a read on this desk. */
  const { can } = useCan()
  const canView = can(`${PERMISSIONS.employeeHelpdesk}:read`)

  const columns = useMemo<ColumnDef<EmployeeTicket>[]>(
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
          // Everything the office can DO to a ticket happens in its thread, so
          // the row offers one action: open it.
          <TableRowActions
            onView={canView ? () => list.goToDetail(row.original.id) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: EMPLOYEE_TICKET_SORT.code,
        accessorKey: 'code',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ticket" />,
        meta: { className: 'min-w-[9rem] whitespace-nowrap' },
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
        meta: { className: 'min-w-[18rem]' },
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
        id: 'employee',
        header: 'Raised By',
        enableSorting: false,
        // Employee name + code is one identity — wrapping it mid-code makes the
        // column unreadable, so give it room and keep each line on one line.
        meta: { className: 'min-w-[16rem] whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block truncate text-sm font-medium text-foreground">
              {employeeLabel(row.original)}
            </span>
            {row.original.companyName && (
              <span className="block truncate text-xs text-muted-foreground">
                {row.original.companyName}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <EmployeeTicketCategoryBadge category={row.original.category} />
        ),
      },
      {
        id: EMPLOYEE_TICKET_SORT.priority,
        accessorKey: 'priority',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Priority" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <EmployeeTicketPriorityBadge priority={row.original.priority} />
        ),
      },
      {
        id: EMPLOYEE_TICKET_SORT.status,
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { className: 'min-w-[13rem] whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <EmployeeTicketStatusBadge status={row.original.status} />
            {/* Nobody has answered yet — the one thing a queue should shout. */}
            {!row.original.firstResponseAt && row.original.status !== 'closed' && (
              <Badge variant="warning" className="text-[10px] uppercase">
                Unanswered
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'assignee',
        header: 'Handled By',
        enableSorting: false,
        // Name over its pickup/working chip — neither reads if the column is
        // narrow enough to break them mid-word.
        meta: { className: 'min-w-[13rem] whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="leading-tight">
            <span
              className={
                row.original.assignedToName
                  ? 'block text-sm font-medium text-foreground'
                  : 'block text-sm text-muted-foreground'
              }
            >
              {assigneeLabel(row.original)}
            </span>
            <span className="flex items-center gap-1.5">
              {/* Outstanding and nobody's — the one gap in a queue worth shouting. */}
              <EmployeeTicketPickupBadge needsPickup={row.original.needsPickup} />
              <EmployeeTicketWorkingBadge isBeingWorked={row.original.isBeingWorked} />
              {!row.original.needsPickup && !row.original.isBeingWorked && (
                <span className="text-xs text-muted-foreground">
                  {assignmentSourceLabel(row.original.assignmentSource) ?? ''}
                </span>
              )}
            </span>
          </div>
        ),
      },
      {
        id: 'time_spent',
        header: 'Time Spent',
        enableSorting: false,
        meta: { className: 'min-w-[9rem] whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="leading-tight">
            {/* EFFORT above, CALENDAR below — the two are routinely orders of
                magnitude apart, so they're never shown as one number. */}
            <span className="block text-sm tabular-nums text-foreground">
              {formatDuration(row.original.activeWorkSeconds) ?? '—'}
            </span>
            <span className="block text-xs tabular-nums text-muted-foreground">
              {formatDuration(row.original.wallClockSeconds)} elapsed
            </span>
          </div>
        ),
      },
      {
        id: 'message_count',
        accessorKey: 'messageCount',
        header: 'Replies',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center' },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessagesSquare className="size-3.5 shrink-0" />
            {row.original.messageCount}
          </span>
        ),
      },
      {
        id: EMPLOYEE_TICKET_SORT.createdAt,
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Raised" />,
        meta: { className: 'min-w-[11rem] whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="leading-tight">
            {/* No deadline on this desk, so age is what "waiting" is read from. */}
            <span className="block text-sm text-foreground">
              {ageLabel(row.original.ageDays)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {formatDateTime(row.original.createdAt)}
            </span>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.offset, canView],
  )

  if (list.isForbidden) return <Forbidden description={list.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Employee Support"
        description="What your employees have raised from the app, across every company. Most urgent first — this is work waiting on somebody, and nothing here is on a clock."
        actions={
          list.canShowMyDesk && (
            <div className="flex flex-wrap items-center gap-2">
              {/* The two questions a desk with no router actually gets asked. */}
              <Button
                variant={list.filters.unassignedOnly ? 'default' : 'outline'}
                onClick={() =>
                  list.toggleUnassignedOnly(list.filters.unassignedOnly ? '' : 'true')
                }
              >
                <Inbox className="size-4" />
                Needs pickup
              </Button>
              <Button
                variant={list.isMyDesk ? 'default' : 'outline'}
                onClick={() =>
                  list.isMyDesk ? list.changeAssignee(ALL_FILTER) : list.showMyDesk()
                }
              >
                <UserRoundCog className="size-4" />
                On my plate
              </Button>
            </div>
          )
        }
      />

      {/* The tab strip IS the status filter, with its counts read in one call. */}
      <Tabs
        value={list.filters.status}
        onValueChange={list.changeStatus}
        className="mb-4"
      >
        <TabsList className="h-auto flex-wrap">
          {list.tabs.map((tab) => (
            <TabsTrigger key={tab.value || 'all'} value={tab.value}>
              {tab.label}
              {tab.count !== null && (
                <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 text-xs tabular-nums">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.isError ? (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            {getApiErrorMessage(list.error, "Couldn't load the employee help desk.")}
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
                  // The desk is staffed by people, not by company — an HR user
                  // covering two of them sees both without switching screens.
                  key: 'company',
                  label: 'Company',
                  icon: Building2,
                  value: list.filters.companyId,
                  onChange: (value) => list.setFilter('companyId', value),
                  options: list.companyOptions,
                  clearValue: ALL_FILTER,
                  searchPlaceholder: 'Search companies',
                },
                {
                  key: 'category',
                  label: 'Category',
                  icon: Tags,
                  value: list.filters.category,
                  onChange: (value) => list.setFilter('category', value),
                  options: [
                    { label: 'All categories', value: ALL_FILTER },
                    ...EMPLOYEE_TICKET_CATEGORY_OPTIONS,
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
                    ...EMPLOYEE_TICKET_PRIORITY_OPTIONS,
                  ],
                  clearValue: ALL_FILTER,
                  searchable: false,
                },
                {
                  key: 'assignee',
                  label: 'Handled by',
                  icon: UserRoundCog,
                  value: list.filters.assignedToUserId,
                  onChange: list.changeAssignee,
                  options: list.assigneeOptions,
                  clearValue: ALL_FILTER,
                  searchPlaceholder: 'Search people',
                },
                {
                  // Outstanding AND nobody's. It carries its own status
                  // predicate, so picking it clears the tab and "unfinished".
                  key: 'unassigned_only',
                  label: 'Unassigned',
                  icon: Inbox,
                  value: list.filters.unassignedOnly ? 'true' : ALL_FILTER,
                  onChange: list.toggleUnassignedOnly,
                  options: UNASSIGNED_ONLY_OPTIONS,
                  clearValue: ALL_FILTER,
                  searchable: false,
                },
                {
                  // `open_only` spans open + in progress + reopened, which no
                  // single tab can express — hence a facet rather than a tab.
                  key: 'open_only',
                  label: 'Unfinished',
                  icon: Timer,
                  value: list.filters.openOnly ? 'true' : ALL_FILTER,
                  onChange: list.toggleOpenOnly,
                  options: OPEN_ONLY_OPTIONS,
                  clearValue: ALL_FILTER,
                  searchable: false,
                },
              ]}
              onReset={list.resetFilters}
            />
          }
          emptyState={
            <EmptyState
              icon={Headset}
              title={
                list.search || list.hasFilters
                  ? 'No matching tickets'
                  : 'Nothing waiting on you'
              }
              description={
                list.search || list.hasFilters
                  ? 'Try a different search term or clear the filters.'
                  : 'Queries your employees raise from the app land here, most urgent first.'
              }
            />
          }
        />
      )}
    </div>
  )
}
