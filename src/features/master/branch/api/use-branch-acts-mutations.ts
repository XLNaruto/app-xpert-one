import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { hasAnyAct } from '../lib/act-mappers'
import { createBranchActs, updateBranchActs } from './act-registration-api'
import type { BranchFormValues } from '../schemas'
import type { BranchActs } from '../types'

interface SaveBranchActsInput {
  branchId: number
  /** The branch's existing acts row, or `null` when it has none yet. */
  actsId: number | null
  values: BranchFormValues
}

/**
 * Save a branch's applicable acts — POST the first time, PATCH after that.
 *
 * Which call to make is decided by whether the branch already has a row, since
 * a second POST for the same branch is a 409. A branch registered under no act
 * at all is left without a row entirely: an all-null insert says nothing the
 * absent row doesn't, and the row gets written the moment something is filled
 * in.
 */
export function useSaveBranchActs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      branchId,
      actsId,
      values,
    }: SaveBranchActsInput): Promise<BranchActs | null> => {
      if (actsId !== null) return updateBranchActs(actsId, values)
      if (!hasAnyAct(values)) return Promise.resolve(null)
      return createBranchActs(branchId, values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actRegistration.all })
    },
  })
}
