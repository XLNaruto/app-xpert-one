import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { useBranchList } from '../hooks/use-branch-list'
import type { Branch } from '../types'

/** Branch master — the list screen with view/edit/delete row actions. */
export function BranchListPage() {
  const {
    rows,
    isLoading,
    isError,
    error,
    goToCreate,
    goToDetail,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useBranchList()

  const columns = useMemo<ColumnDef<Branch>[]>(
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
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <TableRowActions
            onEdit={() => goToEdit(row.original.id)}
            onView={() => goToDetail(row.original.id)}
            onDelete={() => setPendingDelete(row.original)}
          />
        ),
      },
      {
        accessorKey: 'branchName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Branch Name" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.branchName}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.addressLine1}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'state',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
        cell: ({ row }) => (
          <span>
            {[row.original.city, row.original.state].filter(Boolean).join(', ') || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'pinCode',
        header: 'Pin Code',
        cell: ({ row }) => <span>{row.original.pinCode ?? '—'}</span>,
      },
      {
        accessorKey: 'headName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Branch Head" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.headName ?? '—'}</span>
            {row.original.headMobile && (
              <span className="text-xs text-muted-foreground">
                {row.original.headMobile}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'pfCode',
        header: 'PF Code',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.pfCode ?? '—'}</span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Branch"
        description="Manage your branch master records."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add New Branch
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load branches."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchColumn="branchName"
          searchPlaceholder="Search branches…"
          itemName="branches"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Building}
              title="No branches yet"
              description="Create your first branch to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add New Branch
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
        icon={Building}
        title="Delete branch?"
        description={
          pendingDelete
            ? `"${pendingDelete.branchName}" will be permanently removed.`
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
