/**
 * UI-facing shapes for `GET /user/me` (camelCase), mapped from the raw
 * response by `lib/profile-mappers`.
 */

/** The account itself — the organization the signed-in user administers. */
export interface ProfileAccount {
  id: number
  organizationName: string
  organizationEmail: string
  /** Null when no number was recorded against the organization. */
  organizationMobileNumber: string | null
  /** The API's own account status (`active`, `suspended`, …) — kept verbatim. */
  status: string
  /** ISO date-time the account was created. */
  createdAt: string
}

/** The running subscription, without the prices `/user/subscription` carries. */
export interface ProfileSubscription {
  id: number
  planId: number
  /** Razorpay/API status — `active`, `trialing`, `past_due`, `pending`, … */
  status: string
  maxEmployees: number
  maxCompanies: number
  planPermissions: string[]
  isYearly: boolean
  isAutopay: boolean
  isCancel: boolean
  /** ISO date-times, null before the first paid period opens. */
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  razorpayOrderId: string | null
  razorpaySubscriptionId: string | null
}

/** How much of the plan's allowance the account is using. */
export interface ProfileUsage {
  employeeCount: number
  employeeLimit: number
  companyCount: number
  companyLimit: number
}

/**
 * `GET /user/me` — everything the "My Profile" screen shows.
 *
 * `subscription` is null for an account that has never subscribed;
 * `lastSelectedCompanyId` is null until the user picks a company.
 */
export interface MyProfile {
  account: ProfileAccount
  subscription: ProfileSubscription | null
  usage: ProfileUsage
  lastSelectedCompanyId: number | null
}
