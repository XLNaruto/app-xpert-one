import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { BranchFormValues } from '../schemas'
import { createBranch, deleteBranch, updateBranch } from './branch-api'

/** POST /user/branches — create a branch, then refresh the list. */
export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: BranchFormValues) => createBranch(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branch.all })
    },
  })
}

/** PATCH /user/branches/:id — update a branch, then refresh the list + detail. */
export function useUpdateBranch(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: BranchFormValues) => updateBranch(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branch.all })
    },
  })
}

/** DELETE /user/branches/:id — remove a branch, then refresh the list. */
export function useDeleteBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branch.all })
    },
  })
}
