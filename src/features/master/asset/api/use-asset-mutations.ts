import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { AssetFormValues } from '../schemas'
import { createAsset, deleteAsset, updateAsset } from './asset-api'

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

/** PUT /assets/:id — update an asset, then refresh the list. */
export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: AssetFormValues }) =>
      updateAsset(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all })
    },
  })
}

/** DELETE /assets/:id — remove an asset, then refresh the list. */
export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all })
    },
  })
}
