import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { LEAVE_TYPE_DEFAULT_SORT } from '../constants'
import { useLeaveTypes } from '../api/use-leave-types'
import { useDeleteLeaveType } from '../api/use-leave-type-mutations'
import type { LeaveType } from '../types'

/**
 * Orchestrates the leave type master list screen: the list query, navigation to
 * the create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function useLeaveTypeList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, LEAVE_TYPE_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useLeaveTypes(params)
  const deleteLeaveType = useDeleteLeaveType()

  const [pendingDelete, setPendingDelete] = useState<LeaveType | null>(null)

  const goToCreate = () => navigate({ to: '/master/leave-type/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/leave-type/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteLeaveType.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Leave type deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete leave type'),
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
    isDeleting: deleteLeaveType.isPending,
  }
}
