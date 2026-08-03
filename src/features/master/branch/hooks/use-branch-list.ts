import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { BRANCH_DEFAULT_SORT } from '../constants'
import { useBranches } from '../api/use-branches'
import { useDeleteBranch } from '../api/use-branch-mutations'
import type { Branch } from '../types'

/**
 * Orchestrates the branch master list screen: the list query, navigation to the
 * detail/create/edit screens and the delete flow. The page consumes this and
 * only renders.
 */
export function useBranchList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, BRANCH_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useBranches(params)
  const deleteBranch = useDeleteBranch()

  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null)

  const goToCreate = () => navigate({ to: '/master/branch/create' })
  // Detail and edit reuse the same screens as create; the raw id travels
  // encrypted in `?data=` so it's never exposed in the address bar.
  const goToDetail = (id: number) =>
    navigate({ to: '/master/branch/detail', search: { data: encryptId(id) } })
  const goToEdit = (id: number) =>
    navigate({ to: '/master/branch/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteBranch.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Branch deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete branch'),
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
    goToDetail,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteBranch.isPending,
  }
}
