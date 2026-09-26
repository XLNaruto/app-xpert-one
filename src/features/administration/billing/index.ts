/**
 * Billing & Subscription — the module's public surface.
 *
 * One read-only screen plus the account-level reads other features will want:
 * the running subscription's entitlements are the ceiling every role is cut
 * from, and `useAccountOverview` is the only source of the usage counts.
 * Cross-feature imports come through here, never through a deep path.
 */
export { BillingDetailPage } from './pages/billing-detail-page'
export { BillingHistoryPage } from './pages/billing-history-page'

export { usePlans } from './api/use-plans'
export { useSubscription } from './api/use-subscription'
export { useAccountOverview } from './api/use-account-overview'
export { usePurchasedPlans } from './api/use-purchased-plans'
export { useDownloadInvoice, usePurchasePlan } from './api/use-billing-mutations'
export {
  useBillingCredits,
  useCancelScheduledSwitch,
  useCreateSwitchRequest,
  usePendingSwitchRequest,
  useSwitchPlan,
  useSwitchPreview,
  useSwitchRequests,
  useWithdrawSwitchRequest,
} from './api/use-plan-switch'

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
  CreditEntry,
  CreditLedger,
  ExtendType,
  PaymentOrder,
  Plan,
  PlanPurchase,
  PlanPayment,
  PlanUsage,
  PurchasedPlan,
  ScheduledSwitch,
  Subscription,
  SupportSla,
  SwitchChoice,
  SwitchRequest,
  SwitchRequestStatus,
  SwitchResult,
  SwitchSummary,
} from './types'
