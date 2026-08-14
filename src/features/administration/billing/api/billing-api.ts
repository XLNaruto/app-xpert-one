import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  accountOverviewResponseSchema,
  createSubscriptionResponseSchema,
  plansResponseSchema,
  purchasePlanSchema,
  subscriptionResponseSchema,
} from '../schemas'
import type { PurchasePlanPayload } from '../schemas'
import {
  toAccountOverview,
  toPlan,
  toPlanPurchase,
  toSubscription,
} from '../lib/billing-mappers'
import type {
  AccountOverview,
  Plan,
  PlanPurchase,
  Subscription,
} from '../types'

/**
 * Billing — the account's plan catalog, its running subscription and the usage
 * counted against it.
 *
 * Account-scoped, not tenant-scoped: nothing here sends a `company_id`, and none
 * of it changes when the user switches companies.
 */

/**
 * GET /user/plans — the buyable catalog plus any plan built for this
 * organization. Unpaginated: the whole catalog arrives in one read, which is
 * what a comparison grid wants anyway.
 */
export async function fetchPlans(): Promise<Plan[]> {
  try {
    const raw = await http.get<unknown>(endpoints.BILLING.PLANS)
    return plansResponseSchema.parse(raw).items.map(toPlan)
  } catch (error) {
    throw toApiError(error, "Couldn't load the available plans.")
  }
}

/**
 * GET /user/subscription — the running subscription, at the prices and limits it
 * was bought with.
 *
 * An account that has never subscribed has none, which the API can express as an
 * empty body or a 404 — both mean the same thing here, so both come back as
 * `null` rather than as an error the screen would have to translate.
 */
export async function fetchSubscription(): Promise<Subscription | null> {
  try {
    const raw = await http.get<unknown>(endpoints.BILLING.SUBSCRIPTION)
    if (raw === null || raw === undefined || raw === '') return null
    return toSubscription(subscriptionResponseSchema.parse(raw))
  } catch (error) {
    const apiError = toApiError(error, "Couldn't load your subscription.")
    if (apiError.status === 404) return null
    throw apiError
  }
}

/**
 * POST /user/subscriptions — buy a plan.
 *
 * Opens the subscription in `pending` and answers with the Razorpay order that
 * has to be paid before it goes active, so the caller has to carry the order
 * through checkout; nothing here is settled by this call alone.
 */
export async function purchasePlan(
  values: PurchasePlanPayload,
): Promise<PlanPurchase> {
  try {
    const raw = await http.post<unknown, PurchasePlanPayload>(
      endpoints.BILLING.SUBSCRIBE,
      purchasePlanSchema.parse(values),
    )
    return toPlanPurchase(createSubscriptionResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't start the purchase for this plan.")
  }
}

/**
 * GET /user/me — the account overview.
 *
 * Read for `usage`: the employee and company counts against the plan's limits
 * are stated nowhere else. Its `subscription` is the same record
 * `/user/subscription` returns minus the prices, so the screen prefers the
 * dedicated read and falls back to this one.
 */
export async function fetchAccountOverview(): Promise<AccountOverview> {
  try {
    const raw = await http.get<unknown>(endpoints.ME.GET)
    return toAccountOverview(accountOverviewResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load your account details.")
  }
}
