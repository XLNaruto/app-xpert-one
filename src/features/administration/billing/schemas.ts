import { z } from 'zod'
import { SWITCH_REQUEST_NOTE_MAX } from './constants'

/**
 * Which kind of ticket an SLA promise covers, and how urgent it is. Both come
 * straight from the plan catalog.
 */
export const supportSlaSchema = z.object({
  ticket_type: z.enum(['technical', 'billing']),
  priority: z.enum(['normal', 'medium', 'high', 'critical']),
  /** The promised time, counted in `sla_unit`. */
  sla_value: z.number(),
  /**
   * The unit the promise was MADE in. Stored as entered rather than normalised:
   * "2 days" and "48 hours" are the same duration and not the same sentence.
   */
  sla_unit: z.enum(['hours', 'days']),
})

export type SupportSlaResponse = z.infer<typeof supportSlaSchema>

/**
 * One plan from `GET /user/plans` — the public catalog plus any plan built for
 * this organization.
 *
 * Prices are in paise and are the FINAL figure; the `*_per_employee_paise`
 * fields are the rate that figure was quoted from, and are null on a flat-fee
 * plan. `is_active` flags the plan behind the account's running subscription.
 */
export const planResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  max_employees: z.number(),
  max_companies: z.number(),
  month_price_paise: z.number(),
  year_price_paise: z.number(),
  month_price_per_employee_paise: z.number().nullable(),
  year_price_per_employee_paise: z.number().nullable(),
  plan_permissions: z.array(z.string()),
  is_trial: z.boolean(),
  trial_duration_days: z.number().nullable(),
  support_slas: z.array(supportSlaSchema),
  is_custom: z.boolean(),
  is_active: z.boolean(),
})

export type PlanResponse = z.infer<typeof planResponseSchema>

/** `GET /user/plans` — the whole catalog in one unpaginated read. */
export const plansResponseSchema = z.object({
  items: z.array(planResponseSchema),
})

/**
 * A `next_renewal` switch that has been booked but not yet applied. `starts_at`
 * is the current term's end; the nightly run (≈00:15 IST) applies it, so it can
 * sit a few hours in the past before the subscription shows the new plan.
 */
export const scheduledSwitchSchema = z.object({
  plan_id: z.number(),
  plan_name: z.string().nullable(),
  is_yearly: z.boolean(),
  price_paise: z.number(),
  max_employees: z.number(),
  max_companies: z.number(),
  discount_paise: z.number().nullish(),
  starts_at: z.string(),
  booked_at: z.string().nullish(),
  /** Set when a super admin approved the request that booked it. */
  request_id: z.number().nullish(),
})

export type ScheduledSwitchResponse = z.infer<typeof scheduledSwitchSchema>

/**
 * `GET /user/subscription` — the running subscription.
 *
 * Its limits, permissions and prices are the ones captured AT PURCHASE, which is
 * why they're read here rather than off the plan: the catalog quotes today's
 * price, and a subscription bought last year isn't paying it. `status` is a free
 * string on the wire (`active`, `trialing`, `past_due`, …), so it's kept as one.
 */
export const subscriptionResponseSchema = z.object({
  id: z.number(),
  plan_id: z.number(),
  status: z.string(),
  max_employees: z.number(),
  max_companies: z.number(),
  plan_permissions: z.array(z.string()),
  month_price_paise: z.number().nullable(),
  year_price_paise: z.number().nullable(),
  month_price_per_employee_paise: z.number().nullable(),
  year_price_per_employee_paise: z.number().nullable(),
  is_yearly: z.boolean(),
  is_autopay: z.boolean(),
  is_cancel: z.boolean(),
  current_period_start: z.string().nullable(),
  current_period_end: z.string().nullable(),
  razorpay_order_id: z.string().nullable(),
  /** Only `GET /user/me` documents this one, so it's optional here. */
  razorpay_subscription_id: z.string().nullish(),
  /*
   * Plan-switch bookkeeping. Only `GET /user/subscription` (and the switch
   * responses) carry these — `/user/me` doesn't — so every one is optional.
   * `amount_due_paise` is null on a term that wasn't opened by a switch.
   */
  switched_from_subscription_id: z.number().nullish(),
  proration_credit_paise: z.number().nullish(),
  credit_applied_paise: z.number().nullish(),
  discount_paise: z.number().nullish(),
  amount_due_paise: z.number().nullish(),
  /** A booked `next_renewal` switch, applied overnight after the term ends. */
  scheduled_switch: scheduledSwitchSchema.nullish(),
})

export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>

/**
 * The payment order `POST /user/subscriptions` opens — a Razorpay order, quoted
 * in paise like every other price on this API.
 *
 * `status` is Razorpay's own (`created`, `attempted`, `paid`), so it's kept as a
 * free string: it describes the ORDER, not the subscription, and the two move
 * independently until the gateway confirms.
 */
export const paymentOrderSchema = z.object({
  id: z.string(),
  amount_paise: z.number(),
  currency: z.string(),
  status: z.string(),
})

export type PaymentOrderResponse = z.infer<typeof paymentOrderSchema>

/**
 * `POST /user/subscriptions` — the subscription is created straight away, but
 * `pending` until its order is paid, which is why both halves come back
 * together: the order is what the checkout needs, the subscription is what the
 * screen shows afterwards.
 */
export const createSubscriptionResponseSchema = z.object({
  order: paymentOrderSchema,
  subscription: subscriptionResponseSchema,
})

export type CreateSubscriptionResponse = z.infer<
  typeof createSubscriptionResponseSchema
>

/**
 * What a purchase sends. `is_yearly` decides which of the plan's two prices the
 * order is raised for, so it always goes on the wire rather than leaning on the
 * API's `false` default — the grid's cycle toggle is the user's choice, and a
 * silently-monthly order would contradict the price they just read.
 */
export const purchasePlanSchema = z.object({
  plan_id: z.number().int().positive(),
  is_yearly: z.boolean(),
})

export type PurchasePlanPayload = z.infer<typeof purchasePlanSchema>

/**
 * `GET /user/me` — the account overview.
 *
 * Read here for `usage`, which is the only place the employee/company counts are
 * stated against the plan's limits. Its `subscription` is the same record
 * `/user/subscription` returns minus the prices, and it is explicitly nullable:
 * an account that has never subscribed has none.
 */
export const accountOverviewResponseSchema = z.object({
  account: z.object({
    id: z.number(),
    organization_name: z.string(),
    organization_email: z.string(),
    organization_mobile_number: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
  }),
  subscription: subscriptionResponseSchema.nullable(),
  usage: z.object({
    employee_count: z.number(),
    employee_limit: z.number(),
    company_count: z.number(),
    company_limit: z.number(),
  }),
  last_selected_company_id: z.number().nullable(),
})

export type AccountOverviewResponse = z.infer<typeof accountOverviewResponseSchema>

/**
 * The payment that settled one purchased term. Null on the history row when the
 * term was never paid — a free trial, a plan the platform admin set up directly,
 * or an order that was started and abandoned.
 */
export const subscriptionPaymentSchema = z.object({
  id: z.number(),
  razorpay_payment_id: z.string(),
  /** What was actually charged, in paise. */
  amount_paise: z.number(),
  currency: z.string(),
  status: z.string(),
  paid_at: z.string(),
})

export type SubscriptionPaymentResponse = z.infer<typeof subscriptionPaymentSchema>

/**
 * One row of `GET /user/subscriptions` — a plan the account bought, with the
 * prices and limits captured AT PURCHASE (the plan may have been re-priced
 * since), and the payment behind it.
 *
 * `invoice_number` is null exactly when `payment` is — it is what decides
 * whether the row offers an invoice at all.
 */
export const purchasedPlanResponseSchema = z.object({
  id: z.number(),
  plan_id: z.number(),
  /** Null in the rare case the plan row itself is gone. */
  plan_name: z.string().nullable(),
  /** `trialing` | `active` | `completed` | `canceled` — kept as a free string. */
  status: z.string(),
  is_yearly: z.boolean(),
  is_autopay: z.boolean(),
  is_cancel: z.boolean(),
  max_employees: z.number(),
  max_companies: z.number(),
  plan_permissions: z.array(z.string()),
  month_price_paise: z.number().nullable(),
  year_price_paise: z.number().nullable(),
  month_price_per_employee_paise: z.number().nullable(),
  year_price_per_employee_paise: z.number().nullable(),
  current_period_start: z.string().nullable(),
  current_period_end: z.string().nullable(),
  razorpay_order_id: z.string().nullable(),
  purchased_at: z.string(),
  payment: subscriptionPaymentSchema.nullable(),
  invoice_number: z.string().nullable(),
})

export type PurchasedPlanResponse = z.infer<typeof purchasedPlanResponseSchema>

/** `GET /user/subscriptions` — one limit/offset page, newest purchase first. */
export const purchasedPlansResponseSchema = z.object({
  items: z.array(purchasedPlanResponseSchema),
  total: z.number(),
})

/** When a switch takes effect while a plan is running. */
export const extendTypeSchema = z.enum(['immediately', 'next_renewal'])

export type ExtendType = z.infer<typeof extendTypeSchema>

/**
 * What a switch preview, a switch and a switch request send. `extend_type` is
 * required while a plan is running and must be left off when none is — the
 * API then treats the switch as `direct` (starts now, full price).
 */
export const switchPlanSchema = z.object({
  plan_id: z.number().int().positive(),
  is_yearly: z.boolean(),
  extend_type: extendTypeSchema.optional(),
})

export type SwitchPlanPayload = z.infer<typeof switchPlanSchema>

/** A switch request adds the tenant's optional note for the super admin. */
export const switchRequestPayloadSchema = switchPlanSchema.extend({
  note: z
    .string()
    .trim()
    .max(SWITCH_REQUEST_NOTE_MAX, `Keep the note under ${SWITCH_REQUEST_NOTE_MAX} characters.`)
    .optional(),
})

export type SwitchRequestPayload = z.infer<typeof switchRequestPayloadSchema>

/**
 * The priced summary of a switch — returned by preview and by the switch
 * itself. Every money field is in paise. `current` is null when no plan is
 * running, and its `plan_name` is null inside the switch response.
 */
export const switchSummarySchema = z.object({
  mode: z.enum(['direct', 'immediately', 'next_renewal']),
  extend_type: extendTypeSchema.nullable(),
  current: z
    .object({
      subscription_id: z.number(),
      plan_id: z.number(),
      plan_name: z.string().nullable(),
      status: z.string(),
      is_yearly: z.boolean(),
      price_paise: z.number(),
      period_start: z.string().nullable(),
      period_end: z.string().nullable(),
    })
    .nullable(),
  target: z.object({
    plan_id: z.number(),
    plan_name: z.string().nullable(),
    is_yearly: z.boolean(),
    price_paise: z.number(),
    max_employees: z.number(),
    max_companies: z.number(),
  }),
  new_term: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
  }),
  /** The CURRENT term, by exact time. Null when nothing is running. */
  time: z
    .object({
      term_seconds: z.number(),
      elapsed_seconds: z.number(),
      remaining_seconds: z.number(),
    })
    .nullable(),
  price_paise: z.number(),
  proration_credit_paise: z.number(),
  proration_used_paise: z.number(),
  credit_surplus_paise: z.number(),
  amount_before_discount_paise: z.number(),
  discount_paise: z.number(),
  credit_balance_paise: z.number(),
  credit_balance_used_paise: z.number(),
  amount_due_paise: z.number(),
  capacity: z.object({
    ok: z.boolean(),
    companies: z.object({ current: z.number(), max: z.number() }),
    employees: z.object({ current: z.number(), max: z.number() }),
    violations: z.array(z.string()),
  }),
})

export type SwitchSummaryResponse = z.infer<typeof switchSummarySchema>

/**
 * `POST /user/subscriptions/switch`. `switched` — the new term is live and
 * `subscription` is it; `scheduled` — a `next_renewal` was booked and
 * `subscription` is the current term with `scheduled_switch` filled in.
 * `refresh_required` means the plan's permissions changed and the access token
 * has to be re-issued before the next screen trusts it.
 */
export const switchResultSchema = z.object({
  outcome: z.enum(['switched', 'scheduled']),
  subscription: subscriptionResponseSchema,
  summary: switchSummarySchema,
  refresh_required: z.boolean(),
})

export type SwitchResultResponse = z.infer<typeof switchResultSchema>

/** One stored-credit ledger row: `+` added by a switch, `−` spent on one. */
export const creditEntrySchema = z.object({
  id: z.number(),
  amount_paise: z.number(),
  /** `proration_surplus` | `applied` — kept free for kinds added later. */
  kind: z.string(),
  subscription_id: z.number().nullable(),
  note: z.string().nullable(),
  created_at: z.string(),
})

export type CreditEntryResponse = z.infer<typeof creditEntrySchema>

/** `GET /user/billing/credits` — the balance plus one page of its ledger. */
export const creditsResponseSchema = z.object({
  balance_paise: z.number(),
  items: z.array(creditEntrySchema),
  total: z.number(),
})

export type CreditsResponse = z.infer<typeof creditsResponseSchema>

/**
 * A plan change request the tenant sent the super admin. The create response
 * leaves `organization_name` and `plan_name` null.
 */
export const switchRequestSchema = z.object({
  id: z.number(),
  account_id: z.number(),
  organization_name: z.string().nullish(),
  from_subscription_id: z.number().nullable(),
  plan_id: z.number(),
  plan_name: z.string().nullish(),
  is_yearly: z.boolean(),
  extend_type: extendTypeSchema.nullable(),
  note: z.string().nullable(),
  status: z.enum(['pending', 'approved', 'rejected', 'canceled']),
  decided_at: z.string().nullable(),
  decision_note: z.string().nullable(),
  approved_extend_type: extendTypeSchema.nullable(),
  discount_paise: z.number().nullable(),
  result_subscription_id: z.number().nullable(),
  created_at: z.string(),
})

export type SwitchRequestResponse = z.infer<typeof switchRequestSchema>

/** `GET /user/subscriptions/switch-requests` — history, newest first. */
export const switchRequestsResponseSchema = z.object({
  items: z.array(switchRequestSchema),
  total: z.number(),
})
