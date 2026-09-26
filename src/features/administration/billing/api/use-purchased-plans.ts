import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchPurchasedPlans } from './billing-api'

/**
 * GET /user/subscriptions — the account's purchase history, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Lives under
 * the `billing` key family, so a purchase's invalidation refreshes it too.
 */
export function usePurchasedPlans(params: PageParams) {
  return useQuery({
    queryKey: queryKeys.billing.history(params),
    queryFn: () => fetchPurchasedPlans(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
