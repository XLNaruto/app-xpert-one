import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { ESIC_RATE_DEFAULT_SORT } from '../constants'
import { useEsicRates } from '../api/use-esic-rates'
import { useDeleteEsicRate } from '../api/use-esic-rate-mutations'
import type { EsicRate } from '../types'

/**
 * Orchestrates the ESIC rate list screen: the list query, navigation to the
 * create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function useEsicRateList() {
  const navigate = useNavigate()
  const {
    params,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, ESIC_RATE_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useEsicRates(params)
  const deleteEsicRate = useDeleteEsicRate()

  const [pendingDelete, setPendingDelete] = useState<EsicRate | null>(null)

  const goToCreate = () => navigate({ to: '/master/esic-rate/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/esic-rate/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteEsicRate.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('ESIC rate deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete ESIC rate',
        ),
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
    // Server-side ordering — a header click re-queries instead of sorting the
    // page on screen.
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteEsicRate.isPending,
  }
}
