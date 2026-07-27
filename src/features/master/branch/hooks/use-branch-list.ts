import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
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
  const { data, isLoading, isError, error } = useBranches()
  const deleteBranch = useDeleteBranch()

  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null)

  const goToCreate = () => navigate({ to: '/branch/new' })
  const goToDetail = (id: number) =>
    navigate({ to: '/branch/$branchId', params: { branchId: String(id) } })
  const goToEdit = (id: number) =>
    navigate({ to: '/branch/$branchId/edit', params: { branchId: String(id) } })

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

  return {
    rows: data ?? [],
    isLoading,
    isError,
    error,
    goToCreate,
    goToDetail,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteBranch.isPending,
  }
}
