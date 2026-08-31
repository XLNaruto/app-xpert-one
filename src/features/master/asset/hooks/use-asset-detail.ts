import { useNavigate } from '@tanstack/react-router'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useState } from 'react'
import { useAsset } from '../api/use-asset'
import { useAssetVariants } from '../api/use-asset-variants'
import type { StockTarget } from '../types'

/**
 * The asset detail screen — the asset itself and the way back to the list. The
 * variants table below it owns its own state (`useAssetVariantList`).
 *
 * `id` is `undefined` when the `?data=` token is missing or malformed, which is
 * "not found" on a detail page; the query stays disabled in that case.
 *
 * `openHistory` is the token's `history` flag — set when the screen was returned
 * to from an employee record that was opened out of the stock ledger, so the
 * ledger comes back up where it was left.
 */
export function useAssetDetail(id: number | undefined, openHistory = false) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useAsset(id ?? NaN)

  /**
   * How many variants the asset has. A single-record read carries no
   * `variant_count`, so the count comes from the variants themselves — the same
   * cached read the dropdowns use.
   */
  const variants = useAssetVariants(id ?? NaN)
  const variantCount = variants.data?.total ?? 0
  const hasVariants = variantCount > 0

  const [stockOpen, setStockOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(openHistory)

  const goToList = () => navigate({ to: '/master/asset' })

  // A 403 isn't a broken screen, it's a missing permission.
  const isForbidden = isForbiddenError(error)

  /** The dialogs on this screen always address the ASSET's own stock level. */
  const stockTarget: StockTarget | null = data
    ? {
        level: 'asset',
        assetId: data.id,
        name: data.assetName,
        quantity: data.quantity,
      }
    : null

  return {
    asset: data ?? null,
    variantCount,
    /**
     * An asset holds stock, or its variants do. Once the first variant exists
     * the asset's own quantity is forced to 0 and frozen, so the stock controls
     * on this screen belong to the variants from then on.
     */
    hasVariants,
    isVariantCountLoading: variants.isLoading,
    stockOpen,
    setStockOpen,
    historyOpen,
    setHistoryOpen,
    stockTarget,
    isLoading: id !== undefined && isLoading,
    isError: id === undefined || (isError && !isForbidden),
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    goToList,
  }
}
