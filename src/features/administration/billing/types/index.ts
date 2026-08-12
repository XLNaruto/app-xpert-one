/** One support-response promise the plan makes, in the unit it was made in. */
export interface SupportSla {
  ticketType: 'technical' | 'billing'
  priority: 'normal' | 'medium' | 'high' | 'critical'
  value: number
  unit: 'hours' | 'days'
}

/**
 * A buyable plan.
 *
 * Prices are held in RUPEES here — the API talks paise, and the mapper is the
 * one place that division happens, so nothing downstream can forget it. A
 * `perEmployee` rate is null on a flat-fee plan.
 */
export interface Plan {
  id: number
  name: string
  description: string | null
  maxEmployees: number
  maxCompanies: number
  monthPrice: number
  yearPrice: number
  monthPricePerEmployee: number | null
  yearPricePerEmployee: number | null
  /** Permission codes the plan unlocks — the ceiling every role is cut from. */
  planPermissions: string[]
  isTrial: boolean
  trialDurationDays: number | null
  supportSlas: SupportSla[]
  /** Built for this organization rather than sold off the shelf. */
  isCustom: boolean
  /** The plan behind the account's running subscription. */
  isActive: boolean
}

/**
 * The running subscription, with the limits and prices captured at purchase —
 * not the catalog's current ones.
 */
export interface Subscription {
  id: number
  planId: number
  /** `active`, `trialing`, `past_due`, … — a free string on the wire. */
  status: string
  maxEmployees: number
  maxCompanies: number
  planPermissions: string[]
  monthPrice: number | null
  yearPrice: number | null
  monthPricePerEmployee: number | null
  yearPricePerEmployee: number | null
  isYearly: boolean
  isAutopay: boolean
  /** Set when the subscription is running but won't renew. */
  isCancel: boolean
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
}

/** How much of the plan's allowance the account is actually using. */
export interface PlanUsage {
  employeeCount: number
  employeeLimit: number
  companyCount: number
  companyLimit: number
}

/** The organization the subscription is billed to. */
export interface BillingAccount {
  id: number
  organizationName: string
  organizationEmail: string
  organizationMobileNumber: string | null
  status: string
  createdAt: string
}

/** `GET /user/me` — the account, its subscription and its usage in one read. */
export interface AccountOverview {
  account: BillingAccount
  subscription: Subscription | null
  usage: PlanUsage
}
