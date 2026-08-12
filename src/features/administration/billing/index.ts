/**
 * Billing & Subscription — the module's public surface.
 *
 * One read-only screen plus the account-level reads other features will want:
 * the running subscription's entitlements are the ceiling every role is cut
 * from, and `useAccountOverview` is the only source of the usage counts.
 * Cross-feature imports come through here, never through a deep path.
 */
export { BillingDetailPage } from './pages/billing-detail-page'

export { usePlans } from './api/use-plans'
export { useSubscription } from './api/use-subscription'
export { useAccountOverview } from './api/use-account-overview'

export {
  formatPaise,
  paiseToRupees,
  subscriptionStatusLabel,
  subscriptionStatusVariant,
  usageBars,
} from './lib/billing-mappers'
export type { UsageBar } from './lib/billing-mappers'

export type {
  AccountOverview,
  BillingAccount,
  Plan,
  PlanUsage,
  Subscription,
  SupportSla,
} from './types'
