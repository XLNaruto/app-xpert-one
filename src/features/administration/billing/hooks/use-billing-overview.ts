import { useMemo } from 'react'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { usePlans } from '../api/use-plans'
import { useSubscription } from '../api/use-subscription'
import { useAccountOverview } from '../api/use-account-overview'
import { bestYearlySavingsPercent, usageBars } from '../lib/billing-mappers'

/**
 * Orchestrates the billing screen: the three reads behind it and the one view
 * they add up to. The page consumes this and only renders.
 *
 * The subscription is read twice over — `/user/subscription` carries the prices
 * it was bought at, `/user/me` carries the same record without them but is the
 * only source of the usage counts. The dedicated read wins where they overlap,
 * with `/user/me` as the fallback so a failure of one doesn't blank the panel.
 */
export function useBillingOverview() {
  const plans = usePlans()
  const subscription = useSubscription()
  const account = useAccountOverview()

  /** Prices where we have them, the account's copy where we don't. */
  const current = subscription.data ?? account.data?.subscription ?? null

  /** The catalog entry behind the running subscription, for its name and SLAs. */
  const currentPlan = useMemo(() => {
    if (!plans.data) return null
    if (current) {
      const byId = plans.data.find((plan) => plan.id === current.planId)
      if (byId) return byId
    }
    // `is_active` flags the running plan, so it answers even when the
    // subscription read itself failed.
    return plans.data.find((plan) => plan.isActive) ?? null
  }, [plans.data, current])

  const bars = useMemo(
    () => (account.data ? usageBars(account.data.usage) : []),
    [account.data],
  )

  // Every plan except the one being used — what an upgrade would be chosen from.
  const otherPlans = useMemo(
    () => (plans.data ?? []).filter((plan) => plan.id !== currentPlan?.id),
    [plans.data, currentPlan],
  )

  /** The loudest honest yearly claim — what the cycle toggle advertises. */
  const savingsPercent = useMemo(
    () => bestYearlySavingsPercent(plans.data ?? []),
    [plans.data],
  )

  // Billing is gated by `billing:manage`; a 403 is a missing permission, not a
  // broken screen, so the page shows the 403 screen with the server's reason.
  const forbiddenError = [plans.error, subscription.error, account.error].find(
    isForbiddenError,
  )

  return {
    /** The organization the subscription is billed to. */
    account: account.data?.account ?? null,
    subscription: current,
    currentPlan,
    plans: plans.data ?? [],
    otherPlans,
    usage: account.data?.usage ?? null,
    usageBars: bars,
    savingsPercent,
    isLoading: plans.isLoading || subscription.isLoading || account.isLoading,
    /** Only a total failure is an error — a partial read still says something. */
    isError: plans.isError && subscription.isError && account.isError,
    error: plans.error ?? subscription.error ?? account.error,
    isForbidden: Boolean(forbiddenError),
    forbiddenMessage: forbiddenError
      ? getApiErrorMessage(forbiddenError)
      : undefined,
  }
}
