import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchBranchActs } from './act-registration-api'

/**
 * GET /user/act-registrations?branch_id= — one branch's applicable acts.
 *
 * `data` is `null` when the branch has no acts row yet, which is a real answer
 * rather than a miss: it's what tells a save to POST instead of PATCH.
 */
export function useBranchActs(branchId: number) {
  return useQuery({
    queryKey: queryKeys.actRegistration.byBranch(branchId),
    queryFn: () => fetchBranchActs(branchId),
    enabled: Number.isFinite(branchId),
  })
}
