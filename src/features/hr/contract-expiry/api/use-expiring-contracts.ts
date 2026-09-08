import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchExpiringContracts } from './contract-expiry-api'
import type { ContractExpiryParams } from '../types'

/**
 * GET /user/employee-contracts/expiring.
 *
 * `placeholderData: keepPreviousData` because every filter change is a new cache
 * key: without it the card blanks back to a skeleton and the page jumps under a
 * user who only moved the status dropdown.
 *
 * No `staleTime` beyond the client's default — this list is read live and two
 * people work the same desk, so a row somebody else already renewed should stop
 * being offered as soon as the window is refocused.
 */
export function useExpiringContracts(params: ContractExpiryParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.contractExpiry.list(params),
    queryFn: ({ signal }) => fetchExpiringContracts(params, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}
