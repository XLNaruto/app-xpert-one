import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { BranchFormValues } from '../schemas'
import { createBranch, deleteBranch, updateBranch } from './branch-api'

/** POST /branches — create a branch, then refresh the list. */
export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: BranchFormValues) => createBranch(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branch.all })
    },
  })
}

/** PUT /branches/:id — update a branch, then refresh the list + detail. */
export function useUpdateBranch(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: BranchFormValues) => updateBranch(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branch.all })
    },
  })
}

/** DELETE /branches/:id — remove a branch, then refresh the list. */
export function useDeleteBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branch.all })
    },
  })
}
