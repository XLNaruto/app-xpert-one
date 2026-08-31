import { ArrowLeft, Boxes, CalendarDays, History, Layers, PackagePlus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { DetailItem } from '@/components/common/detail-item'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { decryptId, decryptParams } from '@/lib/crypto'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useAssetDetail } from '../hooks/use-asset-detail'
import { AssetVariantTable } from '../components/asset-variant-table'
import { StockChangeDialog } from '../components/stock-change-dialog'
import { StockHistoryDialog } from '../components/stock-history-dialog'

/**
 * One asset, its own stock, and its variants.
 *
 * An asset holds stock, or its variants do — never both. With no variants the
 * asset is countable in itself and handed straight to an employee; from the
 * moment the first variant exists, the variants hold the stock and the asset's
 * own quantity is forced to 0 and frozen. This screen shows whichever half is
 * live. The record id arrives encrypted in the `?data=` search param.
 */
export function AssetDetailPage({ data }: { data?: string }) {
  const id = decryptId(data)
  // Set when Back on an employee record returned here — the employee was opened
  // out of this ledger, so the ledger is what should be back on screen.
  const openHistory = data
    ? decryptParams<{ history?: boolean }>(data)?.history === true
    : false
  const {
    asset,
    hasVariants,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    goToList,
    stockOpen,
    setStockOpen,
    historyOpen,
    setHistoryOpen,
    stockTarget,
  } = useAssetDetail(id, openHistory)

  const { canUpdate, canView } = useResourceAccess(PERMISSIONS.assets)

  if (isForbidden) return <Forbidden description={forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title={asset?.assetName ?? 'Asset Detail'}
        description="The asset, its stock, and the variants counted under it."
        actions={
          <div className="flex items-center gap-2">
            {canView && asset && (
              <Button variant="outline" onClick={() => setHistoryOpen(true)}>
                <History className="size-4" />
                Stock History
              </Button>
            )}
            {/* Refilling the asset itself is refused once it has variants. */}
            {canUpdate && asset && !hasVariants && (
              <Button onClick={() => setStockOpen(true)}>
                <PackagePlus className="size-4" />
                Add / Remove Stock
              </Button>
            )}
            <Button variant="outline" onClick={goToList}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : isError || !asset ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Couldn't load this asset."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 pt-6 sm:grid-cols-3">
              {/* No "Created By": `GET /user/assets/:id` answers with the
                  record's own columns only, so the name is never there to show
                  and the field could only ever read N/A. */}
              <DetailItem icon={Boxes} label="Asset Name" value={asset.assetName} />
              <DetailItem
                icon={CalendarDays}
                label="Created On"
                value={asset.createdAt ? formatDate(asset.createdAt) : null}
              />
              <div>
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Layers className="size-4" />
                  Stock
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {hasVariants ? (
                    // The asset's own quantity means nothing from here on — it
                    // is 0 and frozen, and must never be summed with theirs.
                    <span className="text-sm text-muted-foreground">
                      Held per variant — see the table below.
                    </span>
                  ) : (
                    <>
                      {asset.quantity === 0 ? (
                        <Badge variant="warning">No stock recorded</Badge>
                      ) : (
                        <span className="text-sm font-semibold text-foreground">
                          {asset.quantity} on the shelf
                        </span>
                      )}
                      <Badge variant={asset.isReturnable ? 'success' : 'secondary'}>
                        {asset.isReturnable ? 'Returnable' : 'Consumable'}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {!hasVariants && asset.quantity === 0 && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              This asset has no stock recorded, so handing it to an employee will be
              refused. Add some stock, or give it variants and let those hold the count.
            </p>
          )}

          <Card>
            <CardContent className="pt-6">
              <AssetVariantTable assetId={asset.id} assetQuantity={asset.quantity} />
            </CardContent>
          </Card>
        </div>
      )}

      <StockChangeDialog
        open={stockOpen}
        onOpenChange={setStockOpen}
        target={stockTarget}
      />

      <StockHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        target={stockTarget}
        openedFrom="asset-detail"
      />
    </div>
  )
}
