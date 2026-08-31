import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { AssetFormValues, StockChangeFormValues } from '../schemas'
import { changeAssetStock, createAsset, deleteAsset, updateAsset } from './asset-api'

/** POST /assets — create an asset, then refresh the list. */
export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AssetFormValues) => createAsset(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all })
    },
  })
}

/**
 * PATCH /assets/:id — update an asset, then refresh the list.
 *
 * `withStock` is false for an asset that has variants: quantity and returnable
 * belong to the variants from then on, and sending either is a 409.
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      values,
      withStock = true,
    }: {
      id: number
      values: AssetFormValues
      withStock?: boolean
    }) => updateAsset(id, values, withStock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all })
    },
  })
}

/**
 * POST /assets/:id/stock — refill or write off the asset's own stock.
 *
 * Invalidated on failure too: a 409 means the cached count that allowed the
 * change was stale, so the screen re-reads rather than trusting what it had.
 */
export function useChangeAssetStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: StockChangeFormValues }) =>
      changeAssetStock(id, values),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all })
    },
  })
}

/**
 * DELETE /assets/:id — remove an asset, then refresh the list.
 *
 * Deleting an asset deletes its variants with it, so the variant subtree goes
 * too — otherwise a stale variant page would outlive the asset it hangs off.
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAsset(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all })
      queryClient.removeQueries({ queryKey: queryKeys.assetVariant.ofAsset(id) })
    },
  })
}
