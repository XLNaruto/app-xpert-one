import { useState } from 'react'
import { toast } from 'sonner'
import { useAssets } from '../api/use-assets'
import { useDeleteAsset } from '../api/use-asset-mutations'
import type { AssetRecord } from '../types'

/**
 * Orchestrates the asset master list screen: the list query, the add/edit
 * dialog and the delete flow. The page consumes this and only renders.
 */
export function useAssetList() {
  const { data, isLoading, isError, error } = useAssets()
  const deleteAsset = useDeleteAsset()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AssetRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AssetRecord | null>(null)

  /** Open the dialog blank (create). */
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  /** Open the dialog seeded with a record (edit). */
  const openEdit = (record: AssetRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteAsset.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Asset deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete asset'),
    })
  }

  return {
    rows: data ?? [],
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
    isDeleting: deleteAsset.isPending,
  }
}
