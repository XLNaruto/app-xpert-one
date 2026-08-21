import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchLeaveApprovalChain,
  fetchLeaveApprovalRoleNames,
} from './leave-approval-chain-api'

/**
 * GET /user/leave-approval-chain — the account's chain plus its coverage.
 *
 * No company in the key: the chain is account-level, and one chain answers for
 * every company.
 */
export function useLeaveApprovalChain() {
  return useQuery({
    queryKey: queryKeys.leaveApprovalChain.detail(),
    queryFn: fetchLeaveApprovalChain,
  })
}

/** GET /user/leave-approval-chain/roles — the picker's options. */
export function useLeaveApprovalRoleNames() {
  return useQuery({
    queryKey: queryKeys.leaveApprovalChain.roles(),
    queryFn: fetchLeaveApprovalRoleNames,
  })
}
