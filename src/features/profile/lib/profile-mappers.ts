import type { MyProfileResponse } from '../schemas'
import type { MyProfile } from '../types'
import { ACCOUNT_STATUS_TONES, SUBSCRIPTION_STATUS_TONES } from '../constants'
import type { StatusTone } from '../constants'

/** `GET /user/me` → the account, its subscription, its usage. */
export function toMyProfile(response: MyProfileResponse): MyProfile {
  const { account, subscription, usage } = response
  return {
    account: {
      id: account.id,
      organizationName: account.organization_name,
      organizationEmail: account.organization_email,
      organizationMobileNumber: account.organization_mobile_number,
      status: account.status,
      createdAt: account.created_at,
    },
    subscription: subscription
      ? {
          id: subscription.id,
          planId: subscription.plan_id,
          status: subscription.status,
          maxEmployees: subscription.max_employees,
          maxCompanies: subscription.max_companies,
          planPermissions: subscription.plan_permissions,
          isYearly: subscription.is_yearly,
          isAutopay: subscription.is_autopay,
          isCancel: subscription.is_cancel,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          razorpayOrderId: subscription.razorpay_order_id,
          razorpaySubscriptionId: subscription.razorpay_subscription_id,
        }
      : null,
    usage: {
      employeeCount: usage.employee_count,
      employeeLimit: usage.employee_limit,
      companyCount: usage.company_count,
      companyLimit: usage.company_limit,
    },
    lastSelectedCompanyId: response.last_selected_company_id,
  }
}

/** `past_due` → "Past Due". The wire is snake_case, the screen isn't. */
export function statusLabel(status: string): string {
  return status
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/** How an account status should read — neutral for anything added later. */
export function accountStatusTone(status: string): StatusTone {
  return ACCOUNT_STATUS_TONES[status.toLowerCase()] ?? 'neutral'
}

/** How a subscription status should read — neutral for anything added later. */
export function subscriptionStatusTone(status: string): StatusTone {
  return SUBSCRIPTION_STATUS_TONES[status.toLowerCase()] ?? 'neutral'
}

/**
 * The organization's initials for the avatar tile — at most two letters, so a
 * long name doesn't overflow it.
 */
export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

/**
 * A count against its allowance, as the screen states it.
 *
 * A limit of 0 or below means the plan grants none, so there is no share to
 * take — that reads as an empty meter rather than a division by zero.
 */
export function usagePercent(count: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((count / limit) * 100))
}
