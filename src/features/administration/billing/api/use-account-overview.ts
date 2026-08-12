import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchAccountOverview } from './billing-api'

/**
 * GET /user/me — the organization, its subscription and its usage against the
 * plan's limits. The usage counts are what the billing screen needs it for.
 */
export function useAccountOverview() {
  return useQuery({
    queryKey: queryKeys.billing.account(),
    queryFn: fetchAccountOverview,
  })
}
