/**
 * UI-facing shapes for `GET /user/me` (camelCase), mapped from the raw
 * response by `lib/profile-mappers`.
 */

/**
 * The signed-in user themselves — distinct from the account they belong to.
 * Every user, the account owner included, sees and edits their own login here.
 */
export interface ProfileUser {
  id: number
  name: string
  email: string
  /** Null when no number was recorded against the user. */
  mobileNumber: string | null
  /** The API's own user status (`active`, `inactive`, …) — kept verbatim. */
  status: string
  /** Null for the account owner, who holds every permission by birthright. */
  roleId: number | null
  roleName: string | null
  isOwner: boolean
  /** The company this login is scoped to, null for an account-wide login. */
  companyId: number | null
  /** Set when the login is tied to an employee record. */
  employeeId: number | null
  twoFactorAuth: boolean
  /** Storage key (not a URL) of the user's own photo; null shows initials. */
  profilePhoto: string | null
  /** ISO date-time the user was created. */
  createdAt: string
}

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
  user: ProfileUser
  account: ProfileAccount
  subscription: ProfileSubscription | null
  usage: ProfileUsage
  lastSelectedCompanyId: number | null
}
