import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { HOLIDAY_DEFAULT_SORT } from '../constants'
import { useHolidays } from '../api/use-holidays'
import { useDeleteHoliday } from '../api/use-holiday-mutations'
import type { Holiday } from '../types'

/**
 * Orchestrates the holiday master list screen: the list query, navigation to
 * the create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function useHolidayList() {
  const navigate = useNavigate()
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, HOLIDAY_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useHolidays(params)
  const deleteHoliday = useDeleteHoliday()

  const [pendingDelete, setPendingDelete] = useState<Holiday | null>(null)

  const goToCreate = () => navigate({ to: '/master/holiday/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/holiday/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteHoliday.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Holiday deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete holiday'),
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
    isDeleting: deleteHoliday.isPending,
  }
}
