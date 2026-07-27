import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { MapPinned, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { useStateList } from '../hooks/use-state-list'
import { StateFormDialog } from '../components/state-form-dialog'
import type { StateRecord } from '../types'

/** State master — list with add/edit/delete. */
export function StateListPage() {
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
  } = useStateList()

  const columns = useMemo<ColumnDef<StateRecord>[]>(
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
        accessorKey: 'stateName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="State Name" />,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.stateName}</span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="State"
        description="Manage your state master records."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add State
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load states."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchColumn="stateName"
          searchPlaceholder="Search states…"
          itemName="states"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={MapPinned}
              title="No states yet"
              description="Add your first state to get started."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add State
                </Button>
              }
            />
          }
        />
      )}

      <StateFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={MapPinned}
        title="Delete state?"
        description={
          pendingDelete ? `"${pendingDelete.stateName}" will be permanently removed.` : undefined
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
