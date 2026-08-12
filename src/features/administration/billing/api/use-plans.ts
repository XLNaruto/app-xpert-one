import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPlans } from './billing-api'

/**
 * GET /user/plans — every plan this account may buy, with the running one
 * flagged `isActive`. Unpaginated, so no `PageParams`: the catalog is small and
 * a comparison grid wants all of it.
 */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.billing.plans(),
    queryFn: fetchPlans,
  })
}
