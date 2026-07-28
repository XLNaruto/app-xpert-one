import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { usePfRates } from '../api/use-pf-rates'
import { useDeletePfRate } from '../api/use-pf-rate-mutations'
import type { PfRate } from '../types'

/**
 * Orchestrates the PF rate list screen: the list query, navigation to the
 * create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function usePfRateList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = usePfRates()
  const deletePfRate = useDeletePfRate()

  const [pendingDelete, setPendingDelete] = useState<PfRate | null>(null)

  const goToCreate = () => navigate({ to: '/master/pf-rate/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/pf-rate/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deletePfRate.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('PF rate deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete PF rate'),
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
    isDeleting: deletePfRate.isPending,
  }
}
