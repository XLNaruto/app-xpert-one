import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { AssetVariantFormValues, StockChangeFormValues } from '../schemas'
import {
  changeVariantStock,
  createAssetVariant,
  deleteAssetVariant,
  updateAssetVariant,
} from './asset-variant-api'

/**
 * Writes against one asset's variants. Every one of them can move the balance —
 * a create with an opening quantity, an edit that resets the level, a refill —
 * so they all invalidate the asset's whole variant subtree: the list, the
 * variant, and its ledger.
 */

/** POST /assets/:assetId/variants — add a variant. */
export function useCreateAssetVariant(assetId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AssetVariantFormValues) => createAssetVariant(assetId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assetVariant.ofAsset(assetId) })
    },
  })
}

/** PATCH /assets/:assetId/variants/:id — rename, or set a new stock level. */
export function useUpdateAssetVariant(assetId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: AssetVariantFormValues }) =>
      updateAssetVariant(assetId, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assetVariant.ofAsset(assetId) })
    },
  })
}

/** DELETE /assets/:assetId/variants/:id — soft delete. */
export function useDeleteAssetVariant(assetId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAssetVariant(assetId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assetVariant.ofAsset(assetId) })
    },
  })
}

/**
 * POST .../stock — refill or write off, by signed delta.
 *
 * A `409` means the change would take the balance below zero, and the cached
 * count that allowed it was stale — so the subtree is invalidated on failure
 * too, and the screen re-reads rather than trusting what it had.
 */
export function useChangeVariantStock(assetId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: StockChangeFormValues }) =>
      changeVariantStock(assetId, id, values),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assetVariant.ofAsset(assetId) })
    },
  })
}
