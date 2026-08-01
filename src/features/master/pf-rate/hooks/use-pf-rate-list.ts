import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
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
  const { params, limit, offset, onPaginationChange } = usePagination()
  const { data, isLoading, isError, error } = usePfRates(params)
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

  // A 403 isn't a broken screen, it's a missing permission — the page shows the
  // 403 screen with the server's reason instead of an inline error line.
  const isForbidden = isForbiddenError(error)

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deletePfRate.isPending,
  }
}
