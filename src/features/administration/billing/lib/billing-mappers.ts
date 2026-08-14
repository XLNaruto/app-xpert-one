import { formatCurrency } from '@/lib/utils'
import {
  PAISE_PER_RUPEE,
  SLA_PRIORITY_ORDER,
  SLA_TICKET_LABELS,
  SLA_TICKET_ORDER,
  SUBSCRIPTION_STATUS_VARIANTS,
  USAGE_DANGER_RATIO,
  USAGE_WARN_RATIO,
} from '../constants'
import type {
  AccountOverviewResponse,
  CreateSubscriptionResponse,
  PaymentOrderResponse,
  PlanResponse,
  SubscriptionResponse,
  SupportSlaResponse,
} from '../schemas'
import type {
  AccountOverview,
  PaymentOrder,
  Plan,
  PlanPurchase,
  PlanUsage,
  Subscription,
  SupportSla,
} from '../types'

/**
 * Paise → rupees. The API quotes every price in paise; this is the only place
 * that division happens, so nothing downstream can render a ₹4,99,900 plan.
 */
export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE
}

/** Paise → a formatted price, or null when the plan doesn't quote one. */
export function formatPaise(paise: number | null): string | null {
  return paise === null ? null : formatCurrency(paiseToRupees(paise))
}

function toSupportSla(response: SupportSlaResponse): SupportSla {
  return {
    ticketType: response.ticket_type,
    priority: response.priority,
    value: response.sla_value,
    unit: response.sla_unit,
  }
}

/** API record → the UI plan, prices converted to rupees. */
export function toPlan(response: PlanResponse): Plan {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    maxEmployees: response.max_employees,
    maxCompanies: response.max_companies,
    monthPrice: paiseToRupees(response.month_price_paise),
    yearPrice: paiseToRupees(response.year_price_paise),
    monthPricePerEmployee:
      response.month_price_per_employee_paise === null
        ? null
        : paiseToRupees(response.month_price_per_employee_paise),
    yearPricePerEmployee:
      response.year_price_per_employee_paise === null
        ? null
        : paiseToRupees(response.year_price_per_employee_paise),
    planPermissions: response.plan_permissions,
    isTrial: response.is_trial,
    trialDurationDays: response.trial_duration_days,
    supportSlas: response.support_slas.map(toSupportSla),
    isCustom: response.is_custom,
    isActive: response.is_active,
  }
}

/** API record → the UI subscription, prices converted to rupees. */
export function toSubscription(response: SubscriptionResponse): Subscription {
  return {
    id: response.id,
    planId: response.plan_id,
    status: response.status,
    maxEmployees: response.max_employees,
    maxCompanies: response.max_companies,
    planPermissions: response.plan_permissions,
    monthPrice:
      response.month_price_paise === null
        ? null
        : paiseToRupees(response.month_price_paise),
    yearPrice:
      response.year_price_paise === null
        ? null
        : paiseToRupees(response.year_price_paise),
    monthPricePerEmployee:
      response.month_price_per_employee_paise === null
        ? null
        : paiseToRupees(response.month_price_per_employee_paise),
    yearPricePerEmployee:
      response.year_price_per_employee_paise === null
        ? null
        : paiseToRupees(response.year_price_per_employee_paise),
    isYearly: response.is_yearly,
    isAutopay: response.is_autopay,
    isCancel: response.is_cancel,
    currentPeriodStart: response.current_period_start,
    currentPeriodEnd: response.current_period_end,
  }
}

/**
 * API record → the UI payment order.
 *
 * The paise figure is kept alongside the rupee one rather than replaced: the
 * gateway is handed paise, and rounding a display value back up would be a way
 * to charge the wrong amount.
 */
export function toPaymentOrder(response: PaymentOrderResponse): PaymentOrder {
  return {
    id: response.id,
    amountPaise: response.amount_paise,
    amount: paiseToRupees(response.amount_paise),
    currency: response.currency,
    status: response.status,
  }
}

/** `POST /user/subscriptions` → the order to pay and the subscription it opened. */
export function toPlanPurchase(
  response: CreateSubscriptionResponse,
): PlanPurchase {
  return {
    order: toPaymentOrder(response.order),
    subscription: toSubscription(response.subscription),
  }
}

/** `GET /user/me` → the account, its subscription and its usage. */
export function toAccountOverview(
  response: AccountOverviewResponse,
): AccountOverview {
  return {
    account: {
      id: response.account.id,
      organizationName: response.account.organization_name,
      organizationEmail: response.account.organization_email,
      organizationMobileNumber: response.account.organization_mobile_number,
      status: response.account.status,
      createdAt: response.account.created_at,
    },
    subscription: response.subscription
      ? toSubscription(response.subscription)
      : null,
    usage: {
      employeeCount: response.usage.employee_count,
      employeeLimit: response.usage.employee_limit,
      companyCount: response.usage.company_count,
      companyLimit: response.usage.company_limit,
    },
  }
}

/** `past_due` → "Past Due". The wire is snake_case, the screen isn't. */
export function subscriptionStatusLabel(status: string): string {
  return status
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/** Which badge a status paints in — neutral for anything the API adds later. */
export function subscriptionStatusVariant(
  status: string,
): 'success' | 'warning' | 'destructive' | 'secondary' {
  return SUBSCRIPTION_STATUS_VARIANTS[status.toLowerCase()] ?? 'secondary'
}

/** "2 days" / "4 hours" — the promise in the unit it was made in. */
export function slaLabel(sla: SupportSla): string {
  const unit = sla.value === 1 ? sla.unit.replace(/s$/, '') : sla.unit
  return `${sla.value} ${unit}`
}

/** One ticket type's promises, ordered by urgency. */
export interface SlaGroup {
  ticketType: SupportSla['ticketType']
  label: string
  slas: SupportSla[]
}

/**
 * SLAs grouped by ticket type and sorted by urgency within each.
 *
 * The API returns them in storage order, which reads as noise; a support table
 * is scanned by "how bad is it", so the rows climb. A ticket type with no
 * promises is dropped rather than shown as an empty heading.
 */
export function groupSlas(slas: SupportSla[]): SlaGroup[] {
  const rank = (priority: string) => {
    const index = SLA_PRIORITY_ORDER.indexOf(
      priority as (typeof SLA_PRIORITY_ORDER)[number],
    )
    // Anything the API adds later sorts last rather than silently jumping to
    // the top of the table.
    return index === -1 ? SLA_PRIORITY_ORDER.length : index
  }

  return SLA_TICKET_ORDER.map((ticketType) => ({
    ticketType,
    label: SLA_TICKET_LABELS[ticketType] ?? ticketType,
    slas: slas
      .filter((sla) => sla.ticketType === ticketType)
      .sort((a, b) => rank(a.priority) - rank(b.priority)),
  })).filter((group) => group.slas.length > 0)
}

/**
 * What a year costs against twelve months of the monthly price, as a whole
 * percent — the "save 17%" a pricing page leads with.
 *
 * Null when there's nothing to claim: a plan with no monthly price to compare
 * against, or a yearly price that isn't actually cheaper.
 */
export function yearlySavingsPercent(plan: Plan): number | null {
  const twelveMonths = plan.monthPrice * 12
  if (twelveMonths <= 0 || plan.yearPrice <= 0) return null
  if (plan.yearPrice >= twelveMonths) return null
  return Math.round(((twelveMonths - plan.yearPrice) / twelveMonths) * 100)
}

/** The best yearly saving on offer — what the cycle toggle advertises. */
export function bestYearlySavingsPercent(plans: Plan[]): number | null {
  const savings = plans
    .map(yearlySavingsPercent)
    .filter((value): value is number => value !== null)
  return savings.length ? Math.max(...savings) : null
}

/** How far through the paid period the subscription is. */
export interface PeriodProgress {
  percent: number
  daysLeft: number
  totalDays: number
}

/**
 * Where today sits between the period's start and end.
 *
 * Null unless both dates are present and in order — a half-known period can't be
 * a share of anything, and a bar drawn from one date would be a guess wearing a
 * precise-looking number.
 */
export function periodProgress(
  subscription: Subscription | null,
): PeriodProgress | null {
  if (!subscription?.currentPeriodStart || !subscription.currentPeriodEnd) {
    return null
  }

  const start = new Date(subscription.currentPeriodStart).getTime()
  const end = new Date(subscription.currentPeriodEnd).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null

  const now = Date.now()
  const span = end - start
  const elapsed = Math.min(Math.max(now - start, 0), span)
  const dayMs = 24 * 60 * 60 * 1000

  return {
    percent: Math.round((elapsed / span) * 100),
    daysLeft: Math.max(0, Math.ceil((end - now) / dayMs)),
    totalDays: Math.round(span / dayMs),
  }
}

/** One usage meter's derived state — how full it is and how that should read. */
export interface UsageBar {
  label: string
  count: number
  limit: number
  /** 0–100, clamped so an over-limit account still renders a full bar. */
  percent: number
  tone: 'normal' | 'warning' | 'danger'
}

/**
 * A count against its allowance.
 *
 * A limit of 0 (or below) means the plan states none, so there's nothing to be a
 * share OF — that renders as an empty bar rather than a division by zero.
 */
export function toUsageBar(label: string, count: number, limit: number): UsageBar {
  const ratio = limit > 0 ? count / limit : 0
  return {
    label,
    count,
    limit,
    percent: Math.min(100, Math.round(ratio * 100)),
    tone:
      ratio >= USAGE_DANGER_RATIO
        ? 'danger'
        : ratio >= USAGE_WARN_RATIO
          ? 'warning'
          : 'normal',
  }
}

/** Both meters the billing screen shows, in the order it shows them. */
export function usageBars(usage: PlanUsage): UsageBar[] {
  return [
    toUsageBar('Employees', usage.employeeCount, usage.employeeLimit),
    toUsageBar('Companies', usage.companyCount, usage.companyLimit),
  ]
}
