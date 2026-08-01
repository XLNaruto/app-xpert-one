import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { usePtRates } from '../api/use-pt-rates'
import { useDeletePtRate } from '../api/use-pt-rate-mutations'
import type { PtRate } from '../types'

/**
 * Orchestrates the PT rate list screen: the list query, navigation to the
 * create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function usePtRateList() {
  const navigate = useNavigate()
  const { params, limit, offset, search, setSearch, onPaginationChange } =
    usePagination()
  const { data, isLoading, isError, error } = usePtRates(params)
  const deletePtRate = useDeletePtRate()

  const [pendingDelete, setPendingDelete] = useState<PtRate | null>(null)

  const goToCreate = () => navigate({ to: '/master/pt-rate/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/pt-rate/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deletePtRate.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('PT rate deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete PT rate'),
    })
  }

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deletePtRate.isPending,
  }
}
