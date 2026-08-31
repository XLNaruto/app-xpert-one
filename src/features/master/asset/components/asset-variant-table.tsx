import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { History, Layers, PackagePlus, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ASSET_VARIANT_SORT } from '../constants'
import { useAssetVariantList } from '../hooks/use-asset-variant-list'
import { AssetVariantFormDialog } from './asset-variant-form-dialog'
import { StockChangeDialog } from './stock-change-dialog'
import { StockHistoryDialog } from './stock-history-dialog'
import type { AssetVariant } from '../types'

/**
 * Why the first variant can't be added yet. The API's own 409 says the same,
 * naming the number — this is the version we can show before the click, since
 * the count is already on the row.
 */
const BLOCKED_BY_OWN_STOCK =
  'This asset still holds stock of its own. Return every handout and set its quantity to 0 first — the variants hold the stock from then on.'

/**
 * The variants of one asset, with their stock.
 *
 * Quantity is a property of the variant, never of the asset — the master above
 * carries no number at all. What's shown here is a **balance**: what's on the
 * shelf right now, not what was ever bought.
 */
export function AssetVariantTable({
  assetId,
  assetQuantity,
}: {
  assetId: number
  /**
   * The asset's OWN stock. Adding the first variant is refused while the asset
   * still holds units of its own — the count has to move to the variants, not be
   * silently duplicated — so the button says so before the 409 does.
   */
  assetQuantity: number
}) {
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
    stockFor,
    setStockFor,
    historyFor,
    setHistoryFor,
  } = useAssetVariantList(assetId)

  // The switch from asset-level to variant-level stock happens once, and only
  // from an empty shelf. The API refuses the rest; this is the half we can see.
  const blockedByOwnStock = assetQuantity > 0

  // Variants and stock ride on the asset master's own five codes — there are no
  // new permissions to hold. Refill / write off is an update.
  const { canCreate, canUpdate, canDelete, canView } = useResourceAccess(PERMISSIONS.assets)

  const columns = useMemo<ColumnDef<AssetVariant>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{offset + row.index + 1}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <TableRowActions
              onEdit={canUpdate ? () => openEdit(row.original) : undefined}
              onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
            />
            {canUpdate && (
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
                <TooltipContent>Stock history</TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        // Sortable columns carry the API's own field name as their id.
        id: ASSET_VARIANT_SORT.variantName,
        accessorKey: 'variantName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Variant" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.variantName}</span>
        ),
      },
      {
        id: ASSET_VARIANT_SORT.quantity,
        accessorKey: 'quantity',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Quantity" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.quantity === 0 ? (
            <Badge variant="destructive">Out of stock</Badge>
          ) : (
            <span className="font-medium text-foreground">{row.original.quantity}</span>
          ),
      },
      {
        id: 'isReturnable',
        enableSorting: false,
        header: 'Returnable',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.isReturnable ? (
            <Badge variant="success">Returnable</Badge>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Badge variant="secondary">Consumable</Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Issuing one consumes it — no status change puts the unit back.
              </TooltipContent>
            </Tooltip>
          ),
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<AssetVariant>({ createdAt: ASSET_VARIANT_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete, canView, offset],
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">Variants</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The countable thing under this asset. Quantity is what's on the shelf right
            now — assigning a unit takes it down, a return puts it back.
          </p>
          {blockedByOwnStock && (
            <p className="mt-2 max-w-xl text-sm text-warning">{BLOCKED_BY_OWN_STOCK}</p>
          )}
        </div>
        {canCreate &&
          (blockedByOwnStock ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled>
                    <Plus className="size-4" />
                    Add Variant
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs whitespace-pre-wrap font-normal">
                {BLOCKED_BY_OWN_STOCK}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add Variant
            </Button>
          ))}
      </div>

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load the variants."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search variants…"
          itemName="variants"
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
              icon={Layers}
              title={search ? 'No matching variants' : 'No variants yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Add a variant to start counting stock for this asset.'
              }
              action={
                search || blockedByOwnStock
                  ? undefined
                  : canCreate && (
                      <Button onClick={openCreate}>
                        <Plus className="size-4" />
                        Add Variant
                      </Button>
                    )
              }
            />
          }
        />
      )}

      <AssetVariantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        assetId={assetId}
        record={editing}
      />

      <StockChangeDialog
        open={stockFor !== null}
        onOpenChange={(open) => !open && setStockFor(null)}
        target={
          stockFor
            ? {
                level: 'variant',
                assetId,
                variantId: stockFor.id,
                name: stockFor.variantName,
                quantity: stockFor.quantity,
              }
            : null
        }
      />

      <StockHistoryDialog
        open={historyFor !== null}
        onOpenChange={(open) => !open && setHistoryFor(null)}
        target={
          historyFor
            ? {
                level: 'variant',
                assetId,
                variantId: historyFor.id,
                name: historyFor.variantName,
                quantity: historyFor.quantity,
              }
            : null
        }
        // This table only ever renders on the asset's detail screen.
        openedFrom="asset-detail"
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Layers}
        title="Delete variant?"
        description={
          pendingDelete
            ? `"${pendingDelete.variantName}" will be removed, along with the ${pendingDelete.quantity} unit(s) it counts. Employees still holding one will block the delete.`
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
