import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { usePfOfficeAddressList } from '../hooks/use-pf-office-address-list'
import type { PfOfficeAddress } from '../types'

/** PF office address master — one row per EPFO office, with add/edit/delete. */
export function PfOfficeAddressListPage() {
  const {
    rows,
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = usePfOfficeAddressList()

  const columns = useMemo<ColumnDef<PfOfficeAddress>[]>(
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
        accessorKey: 'officeCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Office Code" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.officeCode}</span>
        ),
      },
      {
        accessorKey: 'officeName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Office Name" />
        ),
        meta: { className: 'whitespace-nowrap' },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.email || '—',
      },
      {
        accessorKey: 'state',
        header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
        meta: { className: 'whitespace-nowrap' },
      },
      {
        accessorKey: 'district',
        header: 'District',
        meta: { className: 'whitespace-nowrap' },
      },
      {
        accessorKey: 'city',
        header: 'City',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.city || '—',
      },
      {
        accessorKey: 'officeType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Office Type" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.officeType || '—',
      },
      ...auditColumns<PfOfficeAddress>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="PF Office Address"
        description="Manage the EPFO regional and sub-regional offices branches register with."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add PF Address
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load PF office addresses."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search PF address…"
          itemName="PF addresses"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Building2}
              title="No PF office addresses yet"
              description="Add your first EPFO office to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add PF Address
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
        icon={Building2}
        title="Delete PF office address?"
        description={
          pendingDelete
            ? `${pendingDelete.officeName} (${pendingDelete.officeCode}) will be permanently removed.`
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
