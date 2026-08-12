import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Boxes, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ScopedDataError } from '@/features/company'
import { ASSET_SORT } from '../constants'
import { useAssetList } from '../hooks/use-asset-list'
import { AssetFormDialog } from '../components/asset-form-dialog'
import type { AssetRecord } from '../types'

/** Asset master — list with add/edit/delete. */
export function AssetListPage() {
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

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.assets)

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
            onEdit={canUpdate ? () => openEdit(row.original) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: ASSET_SORT.assetName,
        accessorKey: 'assetName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Asset Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.assetName}</span>
        ),
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<AssetRecord>({ createdAt: ASSET_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Manage your asset master records."
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add Asset
            </Button>
          )
        }
      />

      {isError ? (
        <ScopedDataError
          error={error}
          fallback="Couldn't load assets."
          what="assets"
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search assets…"
          itemName="assets"
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
              icon={Boxes}
              title={search ? 'No matching assets' : 'No assets yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Add your first asset to get started.'
              }
              action={
                search
                  ? undefined
                  : canCreate && (
                      <Button onClick={openCreate}>
                        <Plus className="size-4" />
                        Add Asset
                      </Button>
                    )
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
          pendingDelete
            ? `"${pendingDelete.assetName}" will be permanently removed.`
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
