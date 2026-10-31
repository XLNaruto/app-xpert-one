import type {
  MyProfileResponse,
  ProfileEditFormValues,
  UpdateMyProfileBody,
} from '../schemas'
import type { MyProfile, ProfileUser } from '../types'
import { ACCOUNT_STATUS_TONES, SUBSCRIPTION_STATUS_TONES } from '../constants'
import type { StatusTone } from '../constants'

/** `GET /user/me` → the user, the account, its subscription, its usage. */
export function toMyProfile(response: MyProfileResponse): MyProfile {
  const { user, account, subscription, usage } = response
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobile_number,
      status: user.status,
      roleId: user.role_id,
      roleName: user.role_name,
      isOwner: user.is_owner,
      companyId: user.company_id,
      employeeId: user.employee_id,
      twoFactorAuth: user.two_factor_auth,
      profilePhoto: user.profile_photo ?? null,
      createdAt: user.created_at,
    },
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

/**
 * Whether this login *is* the account rather than a person within it.
 *
 * The owner holds every permission by birthright and so carries no role; a role
 * on the login means somebody was granted it, which only happens to a person
 * other than the account itself. `is_owner` alone isn't enough — the API has
 * been seen setting it on role-holding logins too — so the absent role is what
 * decides.
 *
 * Both the profile screen and the topbar branch on this, so they always name
 * the same party.
 */
export function isAccountItself(user: ProfileUser): boolean {
  return user.isOwner && user.roleName === null && user.roleId === null
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

/**
 * A mobile number as the API takes it — digits only. The spaces, dashes and
 * `+91` / leading `0` people type are stripped, so `+91 98765 43210` and
 * `098765-43210` both become `9876543210`.
 */
export function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

/** The signed-in user → the edit form, prefilled. */
export function toProfileEditFormValues(user: ProfileUser): ProfileEditFormValues {
  return {
    name: user.name,
    email: user.email,
    mobileNumber: user.mobileNumber ? normalizeMobile(user.mobileNumber) : '',
  }
}

/**
 * The `PATCH /user/me` body — only what differs from the stored user, since a
 * field left out stays as it is. Empty when nothing changed. The email is the
 * login and is stored lower-case, so it's compared that way too.
 */
export function toUpdateMyProfileBody(
  values: ProfileEditFormValues,
  user: ProfileUser,
): UpdateMyProfileBody {
  const body: UpdateMyProfileBody = {}
  const name = values.name.trim()
  const email = values.email.trim().toLowerCase()
  const mobile = values.mobileNumber ? normalizeMobile(values.mobileNumber) : null
  const storedMobile = user.mobileNumber ? normalizeMobile(user.mobileNumber) : null

  if (name !== user.name) body.name = name
  if (email !== user.email.toLowerCase()) body.email = email
  if (mobile !== storedMobile) body.mobile_number = mobile
  return body
}

/** Which form field a failed `PATCH /user/me` is about, when it can be told. */
export type ProfileEditField = keyof ProfileEditFormValues

const BODY_FIELD_TO_FORM: Record<keyof UpdateMyProfileBody, ProfileEditField> = {
  name: 'name',
  email: 'email',
  mobile_number: 'mobileNumber',
}

/**
 * Pin a `PATCH /user/me` failure on the field it concerns, so it shows inline
 * rather than as a toast. The server's message names the field (a 409 says
 * whether the email or the mobile is taken; a 400's flattened validation line
 * starts with the field's label); failing that, a request that only sent one
 * field can only be about that one. `null` when it can't be told.
 */
export function profileErrorField(
  message: string,
  body: UpdateMyProfileBody,
): ProfileEditField | null {
  if (/mobile/i.test(message)) return 'mobileNumber'
  if (/e-?mail/i.test(message)) return 'email'
  if (/^name\b/i.test(message)) return 'name'
  const sent = Object.keys(body) as (keyof UpdateMyProfileBody)[]
  return sent.length === 1 ? BODY_FIELD_TO_FORM[sent[0]] : null
}
