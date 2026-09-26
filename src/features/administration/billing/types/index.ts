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
  /** A booked `next_renewal` switch waiting for this term to end. */
  scheduledSwitch: ScheduledSwitch | null
  /** What this term cost after credit and discount; null unless a switch opened it. */
  amountDue: number | null
}

/** A plan switch booked for the end of the current term (rupees). */
export interface ScheduledSwitch {
  planId: number
  planName: string | null
  isYearly: boolean
  price: number
  maxEmployees: number
  maxCompanies: number
  discount: number
  /** The current term's end — when the nightly run applies it. */
  startsAt: string
  bookedAt: string | null
  /** Set when a super admin approved the request that booked it. */
  requestId: number | null
}

/**
 * The payment order raised for a purchase.
 *
 * `amountPaise` stays in PAISE, unlike every other money field here: it is what
 * the gateway is handed, and the gateway counts paise. `amount` carries the same
 * figure in rupees for anything that has to show it.
 */
export interface PaymentOrder {
  id: string
  amountPaise: number
  amount: number
  currency: string
  /** Razorpay's own order status — `created`, `attempted`, `paid`. */
  status: string
}

/** What a purchase answers with: the order to pay, and the subscription it opens. */
export interface PlanPurchase {
  order: PaymentOrder
  subscription: Subscription
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

/** The payment that settled a purchased term, amount in rupees. */
export interface PlanPayment {
  id: number
  razorpayPaymentId: string
  /** What was actually charged — the figure the "Amount paid" column shows. */
  amount: number
  currency: string
  status: string
  paidAt: string
}

/**
 * One plan the account has bought, from the purchase history.
 *
 * Prices are in rupees and are the ones charged AT PURCHASE, not the catalog's
 * current ones. `payment` and `invoiceNumber` are null together: a row without
 * them (a trial, an admin-granted plan, an abandoned order) has no invoice.
 */
export interface PurchasedPlan {
  /** The SUBSCRIPTION id — what the invoice download is keyed by. */
  id: number
  planId: number
  planName: string | null
  status: string
  isYearly: boolean
  isAutopay: boolean
  isCancel: boolean
  maxEmployees: number
  maxCompanies: number
  monthPrice: number | null
  yearPrice: number | null
  monthPricePerEmployee: number | null
  yearPricePerEmployee: number | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  razorpayOrderId: string | null
  purchasedAt: string
  payment: PlanPayment | null
  invoiceNumber: string | null
}

/** When a switch takes effect while a plan is running. */
export type ExtendType = 'immediately' | 'next_renewal'

/** How the API priced a switch — `direct` when no plan was running. */
export type SwitchMode = 'direct' | ExtendType

/** One plan / term / timing choice, as the picker holds it. */
export interface SwitchChoice {
  planId: number
  isYearly: boolean
  /** Null when no plan is running — the API then prices it `direct`. */
  extendType: ExtendType | null
}

/**
 * The priced summary of a switch. Money is in RUPEES (converted in the mapper);
 * `time` is the CURRENT term's, and is null when nothing is running.
 */
export interface SwitchSummary {
  mode: SwitchMode
  extendType: ExtendType | null
  current: {
    subscriptionId: number
    planId: number
    planName: string | null
    status: string
    isYearly: boolean
    price: number
    periodStart: string | null
    periodEnd: string | null
  } | null
  target: {
    planId: number
    planName: string | null
    isYearly: boolean
    price: number
    maxEmployees: number
    maxCompanies: number
  }
  newTerm: { start: string | null; end: string | null }
  time: {
    termSeconds: number
    elapsedSeconds: number
    remainingSeconds: number
  } | null
  price: number
  prorationCredit: number
  prorationUsed: number
  creditSurplus: number
  amountBeforeDiscount: number
  discount: number
  creditBalance: number
  creditBalanceUsed: number
  amountDue: number
  capacity: {
    ok: boolean
    companies: { current: number; max: number }
    employees: { current: number; max: number }
    violations: string[]
  }
}

/** What confirming a switch answers with. */
export interface SwitchResult {
  outcome: 'switched' | 'scheduled'
  subscription: Subscription
  summary: SwitchSummary
  /** The plan's permissions moved — the access token must be re-issued. */
  refreshRequired: boolean
}

/** One stored-credit ledger row, in rupees: positive added, negative used. */
export interface CreditEntry {
  id: number
  amount: number
  kind: string
  subscriptionId: number | null
  note: string | null
  createdAt: string
}

/** The stored-credit balance plus one page of its ledger. */
export interface CreditLedger {
  balance: number
  items: CreditEntry[]
  total: number
}

export type SwitchRequestStatus = 'pending' | 'approved' | 'rejected' | 'canceled'

/** A plan change request sent to the super admin (discount in rupees). */
export interface SwitchRequest {
  id: number
  planId: number
  planName: string | null
  isYearly: boolean
  extendType: ExtendType | null
  note: string | null
  status: SwitchRequestStatus
  decidedAt: string | null
  /** The admin's reason (on a rejection) or note (on an approval). */
  decisionNote: string | null
  approvedExtendType: ExtendType | null
  discount: number | null
  resultSubscriptionId: number | null
  createdAt: string
}
