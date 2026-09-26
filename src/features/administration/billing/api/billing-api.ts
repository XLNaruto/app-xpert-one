import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { downloadFile } from '@/lib/downloads'
import { DEFAULT_PAGE_SIZE, type PageParams, type Paginated } from '@/lib/pagination'
import { PURCHASE_HISTORY_MAX_LIMIT } from '../constants'
import {
  accountOverviewResponseSchema,
  createSubscriptionResponseSchema,
  creditsResponseSchema,
  plansResponseSchema,
  purchasePlanSchema,
  purchasedPlansResponseSchema,
  subscriptionResponseSchema,
  switchPlanSchema,
  switchRequestPayloadSchema,
  switchRequestSchema,
  switchRequestsResponseSchema,
  switchResultSchema,
  switchSummarySchema,
} from '../schemas'
import type {
  PurchasePlanPayload,
  SwitchPlanPayload,
  SwitchRequestPayload,
} from '../schemas'
import {
  toAccountOverview,
  toCreditLedger,
  toPlan,
  toPlanPurchase,
  toPurchasedPlan,
  toSubscription,
  toSwitchRequest,
  toSwitchResult,
  toSwitchSummary,
} from '../lib/billing-mappers'
import type {
  AccountOverview,
  CreditLedger,
  Plan,
  PlanPurchase,
  PurchasedPlan,
  Subscription,
  SwitchChoice,
  SwitchRequest,
  SwitchResult,
  SwitchSummary,
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

/**
 * GET /user/subscriptions — every plan this account has bought, newest first.
 *
 * Paged with `limit`/`offset` only: the endpoint neither searches nor sorts, so
 * `search`/`sort` on the params are ignored. The API caps `limit` at 100, and a
 * negative ("every row") limit is sent as that cap.
 */
export async function fetchPurchasedPlans(
  params: PageParams = { limit: DEFAULT_PAGE_SIZE, offset: 0 },
): Promise<Paginated<PurchasedPlan>> {
  try {
    const raw = await http.get<unknown>(endpoints.BILLING.HISTORY, {
      params: {
        limit:
          params.limit > 0
            ? Math.min(params.limit, PURCHASE_HISTORY_MAX_LIMIT)
            : PURCHASE_HISTORY_MAX_LIMIT,
        offset: params.offset,
      },
    })
    const { items, total } = purchasedPlansResponseSchema.parse(raw)
    return { items: items.map(toPurchasedPlan), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load your purchase history.")
  }
}

/**
 * GET /user/subscriptions/:id/invoice — one purchase's invoice, saved as a PDF.
 *
 * Keyed by the SUBSCRIPTION id, not the payment's. The server renders the PDF on
 * every request and never stores it, so there is no link to cache — it has to be
 * fetched as a blob with the session's bearer header. The saved name is the
 * server's own (`INV-….pdf`), falling back to the invoice number.
 */
export async function downloadInvoice({
  subscriptionId,
  invoiceNumber,
}: {
  subscriptionId: number
  invoiceNumber: string
}): Promise<void> {
  await downloadFile(endpoints.BILLING.INVOICE(subscriptionId), {
    fallbackName: `${invoiceNumber}.pdf`,
    errorMessage: "Couldn't download the invoice.",
  })
}

/**
 * The picker's choice → the wire body. `extend_type` is left OFF (not sent as
 * null) when no plan is running: the API reads its absence as `direct`.
 */
function toSwitchBody(choice: SwitchChoice): SwitchPlanPayload {
  return switchPlanSchema.parse({
    plan_id: choice.planId,
    is_yearly: choice.isYearly,
    ...(choice.extendType ? { extend_type: choice.extendType } : {}),
  })
}

/**
 * POST /user/subscriptions/switch/preview — price a switch without applying it.
 *
 * A plan too small for the account is NOT an error here: it comes back with
 * `capacity.ok = false` and the reasons, which the summary shows.
 */
export async function previewPlanSwitch(choice: SwitchChoice): Promise<SwitchSummary> {
  try {
    const raw = await http.post<unknown, SwitchPlanPayload>(
      endpoints.BILLING.SWITCH_PREVIEW,
      toSwitchBody(choice),
    )
    return toSwitchSummary(switchSummarySchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't price this plan change.")
  }
}

/**
 * POST /user/subscriptions/switch — apply the switch. There is no payment step
 * yet: `immediately`/`direct` go live at once, `next_renewal` is booked.
 */
export async function switchPlan(choice: SwitchChoice): Promise<SwitchResult> {
  try {
    const raw = await http.post<unknown, SwitchPlanPayload>(
      endpoints.BILLING.SWITCH,
      toSwitchBody(choice),
    )
    return toSwitchResult(switchResultSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't change your plan.")
  }
}

/** DELETE /user/subscriptions/switch — cancel a booked `next_renewal` switch. */
export async function cancelScheduledSwitch(): Promise<Subscription> {
  try {
    const raw = await http.delete<unknown>(endpoints.BILLING.SWITCH)
    return toSubscription(subscriptionResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't cancel the booked plan change.")
  }
}

/** GET /user/billing/credits — the stored-credit balance and one ledger page. */
export async function fetchCredits(
  params: PageParams = { limit: DEFAULT_PAGE_SIZE, offset: 0 },
): Promise<CreditLedger> {
  try {
    const raw = await http.get<unknown>(endpoints.BILLING.CREDITS, {
      params: { limit: params.limit, offset: params.offset },
    })
    return toCreditLedger(creditsResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load your stored credit.")
  }
}

/**
 * POST /user/subscriptions/switch-requests — ask the super admin for the switch
 * instead of making it. The switch's own checks run first, so a request that
 * could never be approved is refused here. One pending request per account.
 */
export async function createSwitchRequest(
  choice: SwitchChoice & { note?: string },
): Promise<SwitchRequest> {
  try {
    const note = choice.note?.trim()
    const raw = await http.post<unknown, SwitchRequestPayload>(
      endpoints.BILLING.SWITCH_REQUESTS,
      switchRequestPayloadSchema.parse({
        ...toSwitchBody(choice),
        ...(note ? { note } : {}),
      }),
    )
    return toSwitchRequest(switchRequestSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't send your plan change request.")
  }
}

/** GET /user/subscriptions/switch-requests/pending — the open request, or null. */
export async function fetchPendingSwitchRequest(): Promise<SwitchRequest | null> {
  try {
    const raw = await http.get<unknown>(endpoints.BILLING.SWITCH_REQUEST_PENDING)
    if (raw === null || raw === undefined || raw === '') return null
    return toSwitchRequest(switchRequestSchema.parse(raw))
  } catch (error) {
    const apiError = toApiError(error, "Couldn't load your plan change request.")
    if (apiError.status === 404) return null
    throw apiError
  }
}

/** DELETE /user/subscriptions/switch-requests/pending — withdraw it. */
export async function withdrawSwitchRequest(): Promise<SwitchRequest> {
  try {
    const raw = await http.delete<unknown>(endpoints.BILLING.SWITCH_REQUEST_PENDING)
    return toSwitchRequest(switchRequestSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't withdraw your plan change request.")
  }
}

/** GET /user/subscriptions/switch-requests — request history, newest first. */
export async function fetchSwitchRequests(
  params: PageParams = { limit: DEFAULT_PAGE_SIZE, offset: 0 },
): Promise<Paginated<SwitchRequest>> {
  try {
    const raw = await http.get<unknown>(endpoints.BILLING.SWITCH_REQUESTS, {
      params: { limit: params.limit, offset: params.offset },
    })
    const { items, total } = switchRequestsResponseSchema.parse(raw)
    return { items: items.map(toSwitchRequest), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load your plan change requests.")
  }
}
