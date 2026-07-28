import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Boxes, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { useAssetList } from '../hooks/use-asset-list'
import { AssetFormDialog } from '../components/asset-form-dialog'
import type { AssetRecord } from '../types'

/** Asset master — list with add/edit/delete. */
export function AssetListPage() {
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
  } = useAssetList()

  const columns = useMemo<ColumnDef<AssetRecord>[]>(
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
        meta: { className: 'w-px whitespace-nowrap w-40 min-w-40 max-w-40' },
        cell: ({ row }) => (
          <TableRowActions
            onEdit={() => openEdit(row.original)}
            onDelete={() => setPendingDelete(row.original)}
          />
        ),
      },
      {
        accessorKey: 'assetName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Asset Name" />,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.assetName}</span>
        ),
      },
      ...auditColumns<AssetRecord>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Manage your asset master records."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Asset
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load assets."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchColumn="assetName"
          searchPlaceholder="Search assets…"
          itemName="assets"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Boxes}
              title="No assets yet"
              description="Add your first asset to get started."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add Asset
                </Button>
              }
            />
          }
        />
      )}

      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Boxes}
        title="Delete asset?"
        description={
          pendingDelete ? `"${pendingDelete.assetName}" will be permanently removed.` : undefined
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
