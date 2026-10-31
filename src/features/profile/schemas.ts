import { z } from 'zod'
import { MOBILE_RE, emailField } from '@/lib/validation'
import { normalizeMobile } from './lib/profile-mappers'

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
 * `GET /user/me` — the signed-in user, the account they belong to, the
 * subscription it is running, its usage against that subscription's limits, and
 * the company last picked in the switcher.
 *
 * `status` and the subscription's `status` are free strings on the wire
 * (`active`, `trialing`, `past_due`, …), so they stay strings here and are
 * titled for display in the mapper. `subscription` is nullable: an account that
 * has never subscribed has none, and the screen has to say so rather than crash.
 */
export const myProfileResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    mobile_number: z.string().nullable(),
    status: z.string(),
    role_id: z.number().nullable(),
    role_name: z.string().nullable(),
    is_owner: z.boolean(),
    company_id: z.number().nullable(),
    employee_id: z.number().nullable(),
    two_factor_auth: z.boolean(),
    /** Storage key of the user's own photo, null when none is set. */
    profile_photo: z.string().nullable().optional(),
    created_at: z.string(),
  }),
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

/**
 * `PATCH /user/me` — only the fields that changed. `mobile_number` is digits
 * only, or `null` to clear it. Password, role, status and company aren't part
 * of this body (the API drops them anyway).
 */
export interface UpdateMyProfileBody {
  name?: string
  email?: string
  mobile_number?: string | null
}

/**
 * The "Edit User Details" form. Forms hold strings — a cleared mobile is `''`
 * here and goes out as `null`. The mobile is checked after stripping the
 * spaces / `+91` people type, since that's what gets sent.
 */
export const profileEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please Enter Your Name')
    .max(200, 'Cannot exceed 200 characters'),
  email: emailField({ required: true }),
  mobileNumber: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || MOBILE_RE.test(normalizeMobile(value)),
      'Enter a Valid 10-Digit Mobile Number',
    ),
})

export type ProfileEditFormValues = z.infer<typeof profileEditSchema>
