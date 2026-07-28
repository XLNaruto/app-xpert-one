import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { useLwfOfficeAddressList } from '../hooks/use-lwf-office-address-list'
import type { LwfOfficeAddress } from '../types'

/** LWF office address master — one row per LWF office, with add/edit/delete. */
export function LwfOfficeAddressListPage() {
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
  } = useLwfOfficeAddressList()

  const columns = useMemo<ColumnDef<LwfOfficeAddress>[]>(
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
          <span className="font-medium text-foreground">
            {row.original.officeCode || '—'}
          </span>
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
      ...auditColumns<LwfOfficeAddress>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="LWF Office Address"
        description="Manage the Labour Welfare Board offices establishments file contributions with."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add LWF Address
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load LWF office addresses."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search LWF address…"
          itemName="LWF addresses"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Building2}
              title="No LWF office addresses yet"
              description="Add your first LWF office to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add LWF Address
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
        title="Delete LWF office address?"
        description={
          pendingDelete
            ? `${pendingDelete.officeName} will be permanently removed.`
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
