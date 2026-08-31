import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Boxes, History, Layers, PackagePlus, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ScopedDataError } from '@/features/company'
import { Badge } from '@/components/ui/badge'
import { ASSET_SORT } from '../constants'
import { useAssetList } from '../hooks/use-asset-list'
import { AssetFormDialog } from '../components/asset-form-dialog'
import { StockChangeDialog } from '../components/stock-change-dialog'
import { StockHistoryDialog } from '../components/stock-history-dialog'
import type { AssetRecord } from '../types'

/** Asset master — list with add/edit/delete. */
export function AssetListPage({ data }: { data?: string }) {
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
    openDetail,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
    setStockFor,
    setHistoryFor,
    stockFor,
    historyFor,
    stockTarget,
    historyTarget,
  } = useAssetList(data)

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete, canView } = useResourceAccess(PERMISSIONS.assets)

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
        // Sized to its content: the row carries up to four actions now, and a
        // fixed 10rem column jammed them against both edges.
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <TableRowActions
              onEdit={canUpdate ? () => openEdit(row.original) : undefined}
              onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
            />
            {/* An asset owns stock only while it has no variants; once it does,
                the refill belongs to the variant and the API refuses it here. */}
            {canUpdate && row.original.variantCount === 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Add or remove stock"
                    onClick={() => setStockFor(row.original)}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg bg-success/10 text-success transition-colors hover:bg-success/20"
                  >
                    <PackagePlus className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add / remove stock</TooltipContent>
              </Tooltip>
            )}
            
            {/* Not a plain "view": what the row opens is the asset's variants
                and their stock, so it's labelled and iconed as that. */}
            {canView && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Variants & stock"
                    onClick={() => openDetail(row.original)}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  >
                    <Layers className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Variants &amp; stock</TooltipContent>
              </Tooltip>
            )}
            {canView && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Stock history"
                    onClick={() => setHistoryFor(row.original)}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted-foreground/20"
                  >
                    <History className="size-4" />
                  </button>
                </TooltipTrigger>
                {/* One ledger for the asset: its own lines and its variants'. */}
                <TooltipContent>Stock history</TooltipContent>
              </Tooltip>
            )}
          </div>
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
        cell: ({ row }) =>
          // The name is the way in to the asset's variants and their stock.
          canView ? (
            <button
              type="button"
              onClick={() => openDetail(row.original)}
              className="cursor-pointer text-left font-medium text-foreground hover:text-primary hover:underline"
            >
              {row.original.assetName}
            </button>
          ) : (
            <span className="font-medium text-foreground">{row.original.assetName}</span>
          ),
      },
      {
        id: 'stock',
        enableSorting: false,
        header: 'Stock',
        meta: { className: 'whitespace-nowrap' },
        // An asset holds stock, or its variants do — never both. `variantCount`
        // says which, so the column shows a count or a hand-off, never a sum.
        cell: ({ row }) => {
          const { variantCount, quantity, isReturnable } = row.original
          if (variantCount > 0) {
            return (
              <span className="text-sm text-muted-foreground">
                {variantCount} variant{variantCount === 1 ? '' : 's'}
              </span>
            )
          }
          return (
            <div className="flex items-center gap-2">
              {quantity === 0 ? (
                // Every asset that predates variants reads 0 — the first direct
                // handout will be refused until someone refills it, so say so
                // here rather than letting a 409 be the first they hear of it.
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Badge variant="warning">No stock recorded</Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Add some stock before handing this asset out.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="font-medium text-foreground">{quantity}</span>
              )}
              {!isReturnable && quantity > 0 && (
                <Badge variant="secondary">Consumable</Badge>
              )}
            </div>
          )
        },
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<AssetRecord>({ createdAt: ASSET_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete, canView],
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

      <StockChangeDialog
        open={stockFor !== null}
        onOpenChange={(open) => !open && setStockFor(null)}
        target={stockTarget}
      />

      <StockHistoryDialog
        open={historyFor !== null}
        onOpenChange={(open) => !open && setHistoryFor(null)}
        target={historyTarget}
        openedFrom="asset-list"
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Boxes}
        title="Delete asset?"
        description={
          pendingDelete
            ? // The delete is refused while an employee still holds one, and now
              // also while any stock remains — writing units off has to be a
              // deliberate act with a ledger line behind it.
              `"${pendingDelete.assetName}" will be permanently removed, along with every variant counted under it and its stock history. It can only be deleted once no employee holds one and its stock — its own and its variants' — is written down to 0.`
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
