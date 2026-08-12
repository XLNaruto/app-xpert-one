import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchSubscription } from './billing-api'

/**
 * GET /user/subscription — the running subscription, or `null` for an account
 * that has never subscribed.
 */
export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  })
}
