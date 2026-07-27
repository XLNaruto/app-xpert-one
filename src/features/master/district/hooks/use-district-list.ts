import { useState } from 'react'
import { toast } from 'sonner'
import { useDistricts } from '../api/use-districts'
import { useDeleteDistrict } from '../api/use-district-mutations'
import type { DistrictRecord } from '../types'

/**
 * Orchestrates the district master list screen: the list query, the add/edit
 * dialog and the delete flow. The page consumes this and only renders.
 */
export function useDistrictList() {
  const { data, isLoading, isError, error } = useDistricts()
  const deleteDistrict = useDeleteDistrict()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DistrictRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DistrictRecord | null>(null)

  /** Open the dialog blank (create). */
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  /** Open the dialog seeded with a record (edit). */
  const openEdit = (record: DistrictRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDistrict.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('District deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete district'),
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
    isDeleting: deleteDistrict.isPending,
  }
}
