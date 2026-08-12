import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  accountOverviewResponseSchema,
  plansResponseSchema,
  subscriptionResponseSchema,
} from '../schemas'
import {
  toAccountOverview,
  toPlan,
  toSubscription,
} from '../lib/billing-mappers'
import type { AccountOverview, Plan, Subscription } from '../types'

/**
 * Billing — the account's plan catalog, its running subscription and the usage
 * counted against it.
 *
 * Account-scoped, not tenant-scoped: nothing here sends a `company_id`, and none
 * of it changes when the user switches companies.
 *
 * Read-only. `POST /user/subscriptions` exists on the API and answers with a
 * Razorpay order, but completing that order needs a publishable key the API
 * doesn't hand out — so it isn't wired here rather than being wired into a
 * button that can't finish what it starts.
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
