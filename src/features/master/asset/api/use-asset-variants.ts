import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchAssetVariants, fetchStockMovements } from './asset-variant-api'

/**
 * GET /assets/:assetId/variants — one asset's variants.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * the asset id alone it returns every variant, which is what the employee
 * wizard's dependent dropdown wants.
 *
 * The asset id is part of the key: a variant is only ever addressed through its
 * asset, so there is no cache of variants by id alone.
 */
export function useAssetVariants(assetId: number, params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.assetVariant.list(assetId, params),
    queryFn: () => fetchAssetVariants(assetId, params),
    enabled: Number.isFinite(assetId) && assetId > 0,
    /**
     * Never served stale. A variant row carries its remaining quantity, and the
     * whole point of the wizard's dependent dropdown is to say what's on the
     * shelf *now* — someone else's handout between two picks would otherwise
     * leave a cached count on screen. So every asset pick (the id is part of the
     * key) and every mount refetches, invalidation on writes notwithstanding.
     */
    staleTime: 0,
    refetchOnMount: 'always',
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** GET .../stock-movements — one variant's ledger, newest first. */
export function useStockMovements(
  assetId: number,
  variantId: number,
  params: PageParams = ALL_ROWS,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.assetVariant.movements(assetId, variantId, params),
    queryFn: () => fetchStockMovements(assetId, variantId, params),
    enabled:
      enabled &&
      Number.isFinite(assetId) &&
      assetId > 0 &&
      Number.isFinite(variantId) &&
      variantId > 0,
    placeholderData: keepPreviousData,
  })
}
