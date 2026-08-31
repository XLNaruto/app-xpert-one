import { useCallback, useMemo } from 'react'
import { usePagination } from '@/hooks/use-pagination'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { STOCK_MOVEMENT_DEFAULT_SORT } from '../constants'
import { useAssetStockMovements } from '../api/use-asset'
import { useAssetVariants, useStockMovements } from '../api/use-asset-variants'
import type { StockTarget } from '../types'

/**
 * A stock ledger, paged server-side like every other list. `enabled` is the
 * dialog's open state — the history isn't read until it's looked at.
 *
 * An asset's history is its own lines AND its variants'; a variant's is only its
 * own. Both queries are declared and the target picks which one runs.
 *
 * At asset level the variant names come along, because a movement row names the
 * variant by id: the API resolves the name where it can, and the variants list
 * fills in where it doesn't.
 */
export function useStockHistory(target: StockTarget | null, enabled: boolean) {
  const { params, limit, offset, onPaginationChange, sorting, onSortingChange } =
    usePagination(DEFAULT_PAGE_SIZE, STOCK_MOVEMENT_DEFAULT_SORT)

  const isAssetLevel = target?.level === 'asset'
  const assetId = target?.assetId ?? NaN

  const assetHistory = useAssetStockMovements(assetId, params, enabled && isAssetLevel)
  const variantHistory = useStockMovements(
    assetId,
    target?.level === 'variant' ? target.variantId : NaN,
    params,
    enabled && target?.level === 'variant',
  )

  // Only the asset ledger mixes levels, so only it needs the names.
  const variants = useAssetVariants(enabled && isAssetLevel ? assetId : NaN)
  const variantNames = useMemo(
    () =>
      new Map(
        (variants.data?.items ?? []).map((variant) => [variant.id, variant.variantName]),
      ),
    [variants.data],
  )

  /** Name one line's variant; a line about the asset itself has none. */
  const variantNameOf = useCallback(
    (variantId: number | null, resolved: string) =>
      variantId === null
        ? ''
        : resolved || variantNames.get(variantId) || `#${variantId}`,
    [variantNames],
  )

  const query = isAssetLevel ? assetHistory : variantHistory

  return {
    rows: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    /** Whether to show the Variant column — an asset's ledger spans both levels. */
    showVariantColumn: isAssetLevel,
    variantNameOf,
    limit,
    offset,
    onPaginationChange,
    sorting,
    onSortingChange,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
