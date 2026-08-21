import { z } from 'zod'

/**
 * `POST /user/me/two-factor/{enable,disable}` — the stored flag, after the
 * flip. Both endpoints answer with the same body.
 */
export const twoFactorResponseSchema = z.object({
  two_factor_auth: z.boolean(),
  message: z.string().optional(),
})

export type TwoFactorResponse = z.infer<typeof twoFactorResponseSchema>

/**
 * `GET /user/me` — the signed-in account, the subscription it is running, its
 * usage against that subscription's limits, and the company last picked in the
 * switcher.
 *
 * `status` and the subscription's `status` are free strings on the wire
 * (`active`, `trialing`, `past_due`, …), so they stay strings here and are
 * titled for display in the mapper. `subscription` is nullable: an account that
 * has never subscribed has none, and the screen has to say so rather than crash.
 */
export const myProfileResponseSchema = z.object({
  account: z.object({
    id: z.number(),
    organization_name: z.string(),
    organization_email: z.string(),
    organization_mobile_number: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
  }),
  subscription: z
    .object({
      id: z.number(),
      plan_id: z.number(),
      status: z.string(),
      max_employees: z.number(),
      max_companies: z.number(),
      plan_permissions: z.array(z.string()),
      is_yearly: z.boolean(),
      is_autopay: z.boolean(),
      is_cancel: z.boolean(),
      current_period_start: z.string().nullable(),
      current_period_end: z.string().nullable(),
      razorpay_order_id: z.string().nullable(),
      razorpay_subscription_id: z.string().nullable(),
    })
    .nullable(),
  usage: z.object({
    employee_count: z.number(),
    employee_limit: z.number(),
    company_count: z.number(),
    company_limit: z.number(),
  }),
  last_selected_company_id: z.number().nullable(),
})

export type MyProfileResponse = z.infer<typeof myProfileResponseSchema>
