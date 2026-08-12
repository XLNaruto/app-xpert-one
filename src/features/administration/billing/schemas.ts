import { z } from 'zod'

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
})

export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>

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
