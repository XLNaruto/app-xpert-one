import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchAsset, fetchAssetStockMovements } from './asset-api'

/** GET /assets/:id — one asset, for the detail screen's heading. */
export function useAsset(id: number) {
  return useQuery({
    queryKey: queryKeys.asset.detail(id),
    queryFn: () => fetchAsset(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/**
 * GET /assets/:id/stock-movements — the asset's whole ledger, its own lines and
 * its variants', newest first. Keyed apart from a variant's own history: asset 7
 * and variant 7 are unrelated rows.
 */
export function useAssetStockMovements(
  id: number,
  params: PageParams = ALL_ROWS,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.asset.movements(id, params),
    queryFn: () => fetchAssetStockMovements(id, params),
    enabled: enabled && Number.isFinite(id) && id > 0,
    placeholderData: keepPreviousData,
  })
}
