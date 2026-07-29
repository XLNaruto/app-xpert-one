import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useDesignations } from '../api/use-designations'
import { useDeleteDesignation } from '../api/use-designation-mutations'
import type { Designation } from '../types'

/**
 * Orchestrates the designation master list screen: the list query, navigation
 * to the create/edit screen and the delete flow. The page consumes this and
 * only renders.
 */
export function useDesignationList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useDesignations()
  const deleteDesignation = useDeleteDesignation()

  const [pendingDelete, setPendingDelete] = useState<Designation | null>(null)

  const goToCreate = () => navigate({ to: '/master/designation/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/designation/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDesignation.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Designation deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete designation'),
    })
  }

  return {
    rows: data ?? [],
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteDesignation.isPending,
  }
}
