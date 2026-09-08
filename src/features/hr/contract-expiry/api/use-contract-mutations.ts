import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  completeEmployeeContract,
  renewEmployeeContract,
} from './contract-expiry-api'
import type {
  ContractCompleteFormValues,
  ContractRenewFormValues,
} from '../schemas'

/**
 * The two writes. Both are gated on `employees:update` server-side, and both
 * change the same posting, so they invalidate the same three things:
 *
 * * the worklist itself — the row that was acted on has left it;
 * * `employee.all` — the posting behind step 1 and step 8 has new columns on it;
 * * `dashboard.all` — the `contract_expiring` signal on the attention feed
 *   counts this posting. That feed is cube-backed and will not actually move
 *   until the nightly rebuild, but dropping the cached copy is what stops a
 *   stale count sitting beside a panel that has already updated.
 */
function useInvalidateContract() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.contractExpiry.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  }
}

/** POST …/contract/renew — a new term on the same posting. */
export function useRenewContract() {
  const invalidate = useInvalidateContract()
  return useMutation({
    mutationFn: ({
      employeeId,
      values,
    }: {
      employeeId: number
      values: ContractRenewFormValues
    }) => renewEmployeeContract(employeeId, values),
    onSuccess: invalidate,
  })
}

/** POST …/contract/complete — the term ends and the posting closes. */
export function useCompleteContract() {
  const invalidate = useInvalidateContract()
  return useMutation({
    mutationFn: ({
      employeeId,
      values,
    }: {
      employeeId: number
      values: ContractCompleteFormValues
    }) => completeEmployeeContract(employeeId, values),
    onSuccess: invalidate,
  })
}
