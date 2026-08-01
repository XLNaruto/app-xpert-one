import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PAY_TYPE_LABELS } from '../constants'
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
            onEdit={() => goToEdit(row.original.id)}
            onDelete={() => setPendingDelete(row.original)}
          />
        ),
      },
      {
        accessorKey: 'leaveName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Leave Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.leaveName}</span>
        ),
      },
      {
        accessorKey: 'shortName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Short Name" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.shortName}</span>
        ),
      },
      {
        accessorKey: 'payType',
        header: 'Pay Type',
        cell: ({ row }) => PAY_TYPE_LABELS[row.original.payType],
      },
      ...auditColumns<LeaveType>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Leave Types"
        description="Manage your leave type master records."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add Leave Type
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load leave types."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search name…"
          itemName="leave types"
          pageSizeOptions={[10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          searchValue={search}
          onSearchChange={setSearch}
          emptyState={
            <EmptyState
              icon={CalendarDays}
              title="No leave types yet"
              description="Create your first leave type to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add Leave Type
                </Button>
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
