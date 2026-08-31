import { useState } from 'react'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage } from '@/lib/api-error'
import { ASSET_VARIANT_DEFAULT_SORT } from '../constants'
import { useAssetVariants } from '../api/use-asset-variants'
import { useDeleteAssetVariant } from '../api/use-asset-variant-mutations'
import type { AssetVariant } from '../types'

/**
 * The variants table inside an asset: the paged list, the add/edit dialog, the
 * delete flow, and which variant the stock and history dialogs are pointed at.
 *
 * Everything is scoped to `assetId` — a variant has no life of its own, and a
 * correct variant id under the wrong asset answers `404`.
 */
export function useAssetVariantList(assetId: number) {
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, ASSET_VARIANT_DEFAULT_SORT)

  const { data, isLoading, isError, error } = useAssetVariants(assetId, params)
  const deleteVariant = useDeleteAssetVariant(assetId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AssetVariant | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AssetVariant | null>(null)
  const [stockFor, setStockFor] = useState<AssetVariant | null>(null)
  const [historyFor, setHistoryFor] = useState<AssetVariant | null>(null)

  /** Open the dialog blank (create). */
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  /** Open the dialog seeded with a variant (edit). */
  const openEdit = (variant: AssetVariant) => {
    setEditing(variant)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteVariant.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Variant deleted')
        setPendingDelete(null)
      },
      // A 409 here names how many employees still hold the variant — show the
      // server's sentence rather than a generic failure.
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't delete the variant.")),
    })
  }

  return {
    rows: data?.items ?? [],
    total: data?.total ?? 0,
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
    isDeleting: deleteVariant.isPending,
    stockFor,
    setStockFor,
    historyFor,
    setHistoryFor,
  }
}
