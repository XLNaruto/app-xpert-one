import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { saveLeaveApprovalChain } from './leave-approval-chain-api'

/** What a save sends. `includesOwner` is omitted unless the toggle was touched. */
export interface SaveLeaveApprovalChainInput {
  roleNames: string[]
  /**
   * `undefined` leaves the stored choice alone — never default this to `true`, or
   * a reorder would put an opted-out owner back into the routing.
   */
  includesOwner?: boolean
}

/**
 * PUT /user/leave-approval-chain — replace the chain, then refresh it and the
 * leave register.
 *
 * The register is invalidated too because every leave row carries who it is
 * pending with and whether the reader may decide it — all three follow from the
 * chain, so a save changes the buttons on a screen the user may already be on.
 */
export function useSaveLeaveApprovalChain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roleNames, includesOwner }: SaveLeaveApprovalChainInput) =>
      saveLeaveApprovalChain(roleNames, includesOwner),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveApprovalChain.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.all })
    },
  })
}
