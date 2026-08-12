import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ScopedDataError } from '@/features/company'
import { LEAVE_TYPE_SORT, PAY_TYPE_LABELS } from '../constants'
import { useLeaveTypeList } from '../hooks/use-leave-type-list'
import type { LeaveType } from '../types'

/** Leave type master — list with add/edit/delete. */
export function LeaveTypeListPage() {
  const {
    rows,
    total,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useLeaveTypeList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.leaveTypes)

  const columns = useMemo<ColumnDef<LeaveType>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <TableRowActions
            onEdit={canUpdate ? () => goToEdit(row.original.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: LEAVE_TYPE_SORT.leaveName,
        accessorKey: 'leaveName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Leave Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.leaveName}</span>
        ),
      },
      {
        id: LEAVE_TYPE_SORT.shortName,
        accessorKey: 'shortName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Short Name" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.shortName}</span>
        ),
      },
      {
        // The endpoint can't order by pay type, so this header stays plain text.
        accessorKey: 'payType',
        enableSorting: false,
        header: 'Pay Type',
        cell: ({ row }) => PAY_TYPE_LABELS[row.original.payType],
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<LeaveType>({ createdAt: LEAVE_TYPE_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  return (
    <div>
      <PageHeader
        title="Leave Types"
        description="Manage your leave type master records."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add Leave Type
            </Button>
          )
        }
      />

      {isError ? (
        <ScopedDataError
          error={error}
          fallback="Couldn't load leave types."
          what="leave types"
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search short code or name…"
          itemName="leave types"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          searchValue={search}
          onSearchChange={setSearch}
          manualSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          emptyState={
            <EmptyState
              icon={CalendarDays}
              title={search ? 'No matching leave types' : 'No leave types yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Create your first leave type to get started.'
              }
              action={
                search
                  ? undefined
                  : canCreate && (
                      <Button onClick={goToCreate}>
                        <Plus className="size-4" />
                        Add Leave Type
                      </Button>
                    )
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={CalendarDays}
        title="Delete leave type?"
        description={
          pendingDelete
            ? `"${pendingDelete.leaveName}" will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
