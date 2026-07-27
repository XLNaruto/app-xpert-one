import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Map, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { useDistrictList } from '../hooks/use-district-list'
import { DistrictFormDialog } from '../components/district-form-dialog'
import type { DistrictRecord } from '../types'

/** District master — list with add/edit/delete. */
export function DistrictListPage() {
  const {
    rows,
    isLoading,
    isError,
    error,
    formOpen,
    setFormOpen,
    editing,
    openCreate,
    openEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useDistrictList()

  const columns = useMemo<ColumnDef<DistrictRecord>[]>(
    () => [
      {
        id: 'serial',
        header: '#',
        meta: { className: 'w-px whitespace-nowrap text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        meta: { className: 'w-px whitespace-nowrap w-40 min-w-40 max-w-40' },
        cell: ({ row }) => (
          <TableRowActions
            onEdit={() => openEdit(row.original)}
            onDelete={() => setPendingDelete(row.original)}
          />
        ),
      },
      {
        accessorKey: 'districtName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="District Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.districtName}</span>
        ),
      },
      {
        accessorKey: 'state',
        header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="District"
        description="Manage your district master records."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add District
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load districts."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchColumn="districtName"
          searchPlaceholder="Search districts…"
          itemName="districts"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Map}
              title="No districts yet"
              description="Add your first district to get started."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add District
                </Button>
              }
            />
          }
        />
      )}

      <DistrictFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Map}
        title="Delete district?"
        description={
          pendingDelete
            ? `"${pendingDelete.districtName}" will be permanently removed.`
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
