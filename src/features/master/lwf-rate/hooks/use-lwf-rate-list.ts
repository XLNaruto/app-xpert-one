import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { LWF_RATE_DEFAULT_SORT } from '../constants'
import { useLwfRates } from '../api/use-lwf-rates'
import { useDeleteLwfRate } from '../api/use-lwf-rate-mutations'
import type { LwfRate } from '../types'

/**
 * Orchestrates the LWF rate list screen: the list query, navigation to the
 * create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function useLwfRateList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, LWF_RATE_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useLwfRates(params)
  const deleteLwfRate = useDeleteLwfRate()

  const [pendingDelete, setPendingDelete] = useState<LwfRate | null>(null)

  const goToCreate = () => navigate({ to: '/master/lwf-rate/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/lwf-rate/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteLwfRate.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('LWF rate deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete LWF rate'),
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
    search,
    setSearch,
    // Server-side ordering — a header click re-queries instead of sorting the
    // page on screen.
    sorting,
    onSortingChange,
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
    isDeleting: deleteLwfRate.isPending,
  }
}
