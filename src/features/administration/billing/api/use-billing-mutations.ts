import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { purchasePlan } from './billing-api'
import type { PlanPurchase } from '../types'

/**
 * POST /user/subscriptions — buy a plan.
 *
 * Invalidates the whole `billing` family rather than just the subscription: the
 * catalog's `is_active` flag and `/user/me`'s limits move with the purchase too,
 * so refreshing one read would leave the grid marking the old plan as current.
 *
 * The subscription this opens is `pending` until its order is paid, so success
 * here is "the order exists", not "the plan is running" — the caller carries the
 * order through checkout and invalidates again when the gateway comes back.
 */
export function usePurchasePlan() {
  const queryClient = useQueryClient()

  return useMutation<PlanPurchase, Error, { planId: number; isYearly: boolean }>({
    mutationFn: ({ planId, isYearly }) =>
      purchasePlan({ plan_id: planId, is_yearly: isYearly }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
  })
}
