import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, CircleDot, CirclePlay, CircleStop, Eye, ListChecks, Trash2, UserCheck } from 'lucide-react'
import { decryptParams } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { FilterBar } from '@/components/common/filter-bar'
import { RowActionsMenu } from '@/components/common/row-actions-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader, rowNumber } from '@/components/data-table'
import { formatDate } from '@/lib/utils'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import { ASSIGNMENT_STATUS_OPTIONS, SOP_ASSIGNMENT_SORT } from '../constants'
import { useSopAssignmentList } from '../hooks/use-sop-assignment-list'
import { AssignmentActionDialog } from '../components/assignment-action-dialog'
import type { SopAssignmentRow } from '../types'

/**
 * SOP Assignments — which employee runs which SOP group, and for how long.
 * `?data=` may carry `{ groupId }` to open narrowed to one group.
 */
export function SopAssignmentListPage({ data }: { data?: string }) {
  const groupId = data ? Number(decryptParams<{ groupId?: number }>(data)?.groupId) : Number.NaN
  const list = useSopAssignmentList(Number.isFinite(groupId) ? groupId : undefined)

  const columns = useMemo<ColumnDef<SopAssignmentRow>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row, table }) => <span className="text-sm">{rowNumber(row, table)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <RowActionsMenu
            actions={[
              ...(list.access.canView
                ? [{ label: 'View', icon: Eye, onSelect: () => list.goToDetail(row.original.id) }]
                : []),
              ...(list.access.canUpdate
                ? [
                    row.original.status === 'active'
                      ? { label: 'Stop', icon: CircleStop, onSelect: () => list.actions.askStop(row.original) }
                      : { label: 'Start', icon: CirclePlay, onSelect: () => list.actions.askStart(row.original) },
                  ]
                : []),
              // Gone once anyone has started work on it (R8) — Stop keeps the history instead.
              ...(list.access.canDelete && row.original.canDelete
                ? [
                    {
                      label: 'Delete',
                      icon: Trash2,
                      destructive: true,
                      separated: true,
                      onSelect: () => list.actions.askDelete(row.original),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
      {
        id: SOP_ASSIGNMENT_SORT.employeeName,
        accessorKey: 'employeeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer text-left disabled:cursor-default"
            disabled={!list.access.canView}
            onClick={() => list.goToDetail(row.original.id)}
          >
            <p className="font-medium hover:text-primary">{row.original.employeeName}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.original.employeeCode}</p>
          </button>
        ),
      },
      {
        accessorKey: 'departmentName',
        header: 'Department',
        enableSorting: false,
      },
      {
        id: SOP_ASSIGNMENT_SORT.templateName,
        accessorKey: 'templateName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="SOP Group" />,
        cell: ({ row }) => (
          <div>
            <p>{row.original.templateName}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.itemsCount} task{row.original.itemsCount === 1 ? '' : 's'}
              {row.original.customCount > 0 && ` (${row.original.customCount} custom)`} ·{' '}
              {row.original.tasksPerDay} / day
            </p>
          </div>
        ),
      },
      {
        id: SOP_ASSIGNMENT_SORT.effectiveFrom,
        accessorKey: 'effectiveFrom',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Period" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatDate(row.original.effectiveFrom)} →{' '}
            {row.original.effectiveTo ? formatDate(row.original.effectiveTo) : 'Ongoing'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === 'active' ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Stopped</Badge>
          ),
      },
      ...auditColumns<SopAssignmentRow>({ createdAt: SOP_ASSIGNMENT_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.access.canView, list.access.canUpdate, list.access.canDelete],
  )

  return (
    <div>
      <PageHeader
        title="SOP Assignments"
        description="Who runs which SOP group. Their daily tasks appear in My Tasks."
        actions={
          <>
            <Button variant="outline" onClick={list.goToGroups}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </>
        }
      />

      {list.companyId === null ? (
        <CompanyRequired what="SOP assignments" />
      ) : list.isError ? (
        <ScopedDataError error={list.error} fallback="Couldn't load the assignments." what="SOP assignments" />
      ) : (
      <DataTable
        columns={columns}
        data={list.rows}
        isLoading={list.isLoading}
        itemName="assignments"
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
              placeholder: 'Search employee, code or group…',
            }}
            facets={[
              {
                key: 'group',
                label: 'SOP Group',
                icon: ListChecks,
                value: list.filters.groupId,
                onChange: (v) => list.changeFilter({ groupId: v }),
                options: list.groupOptions,
                clearValue: '',
              },
              {
                key: 'status',
                label: 'Status',
                icon: CircleDot,
                value: list.filters.status,
                onChange: (v) => list.changeFilter({ status: v || 'all' }),
                options: ASSIGNMENT_STATUS_OPTIONS,
                searchable: false,
              },
            ]}
            onReset={list.resetFilters}
          />
        }
        emptyState={
          <EmptyState
            icon={UserCheck}
            title="No assignments found"
            description="Assign an SOP group to employees from SOP Tasks to start their daily tasks."
          />
        }
      />
      )}

      <AssignmentActionDialog actions={list.actions} />
    </div>
  )
}
