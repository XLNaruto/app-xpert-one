import { format, parseISO } from 'date-fns'
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CreditCard,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMyProfile } from '../api/use-profile'
import { TwoFactorCard } from '../components/two-factor-card'
import { USAGE_FULL_PERCENT, USAGE_WARN_PERCENT } from '../constants'
import type { StatusTone } from '../constants'
import {
  accountStatusTone,
  initialsOf,
  statusLabel,
  subscriptionStatusTone,
  usagePercent,
} from '../lib/profile-mappers'

/** Format an ISO date/date-time as 'dd MMM yyyy' (falls back to the raw value). */
function formatDate(value: string | null) {
  if (!value) return 'N/A'
  try {
    return format(parseISO(value), 'dd MMM yyyy')
  } catch {
    return value
  }
}

/** Drop the +91 country code for display (keeps other formats untouched). */
function formatPhone(value: string | null) {
  return value ? value.replace(/^\+91/, '') : null
}

const TONE_DOT: Record<StatusTone, string> = {
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-muted-foreground',
}

const TONE_PILL: Record<StatusTone, string> = {
  positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  neutral: 'bg-muted text-muted-foreground',
}

const METER_FILL: Record<StatusTone, string> = {
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-muted-foreground',
}

/** A status pill with its matching dot. */
function StatusPill({ status, tone }: { status: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        TONE_PILL[tone],
      )}
    >
      <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} />
      {statusLabel(status)}
    </span>
  )
}

/** A labelled read-only field tile with a soft-tinted circular icon. */
function Field({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Mail
  label: string
  value: React.ReactNode
  tint: string
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span
        className={cn('grid size-11 shrink-0 place-items-center rounded-full', tint)}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold text-foreground">
          {value ?? 'N/A'}
        </p>
      </div>
    </Card>
  )
}

/**
 * One allowance meter — "3 of 10 employees" with a bar that warns as it fills.
 * A limit of 0 means the plan grants none, so the bar stays empty.
 */
function UsageMeter({
  icon: Icon,
  label,
  count,
  limit,
}: {
  icon: typeof Users
  label: string
  count: number
  limit: number
}) {
  const percent = usagePercent(count, limit)
  const tone: StatusTone =
    percent >= USAGE_FULL_PERCENT
      ? 'danger'
      : percent >= USAGE_WARN_PERCENT
        ? 'warning'
        : 'positive'

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {count}
          <span className="text-muted-foreground"> / {limit}</span>
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', METER_FILL[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/**
 * "My Profile" — a read-only view of the signed-in account, sourced from
 * `GET /user/me`: the organization, the plan it is running and how much of that
 * plan it is using.
 */
export function MyProfilePage() {
  const { data, isLoading, isError, error } = useMyProfile()

  const account = data?.account
  const subscription = data?.subscription
  const usage = data?.usage

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="View Profile"
        description="Your account details as they appear across the panel."
      />

      {isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {error instanceof Error ? error.message : "Couldn't load your profile."}
            </p>
          </CardContent>
        </Card>
      ) : account ? (
        <div className="space-y-5">
          {/* Header card */}
          <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative shrink-0">
                <span className="grid size-16 place-items-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
                  {initialsOf(account.organizationName)}
                </span>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-background',
                    TONE_DOT[accountStatusTone(account.status)],
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-heading text-xl font-semibold text-foreground">
                  {account.organizationName}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="size-3.5" />
                  <span className="truncate">{account.organizationEmail}</span>
                </p>
              </div>
              <StatusPill
                status={account.status}
                tone={accountStatusTone(account.status)}
              />
            </div>
          </div>

          {/* Detail tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              icon={Building2}
              label="Organization Name"
              value={account.organizationName}
              tint="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <Field
              icon={Phone}
              label="Mobile Number"
              value={formatPhone(account.organizationMobileNumber) ?? undefined}
              tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <Field
              icon={Mail}
              label="Email"
              value={account.organizationEmail}
              tint="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            />
            <Field
              icon={ShieldCheck}
              label="Status"
              value={statusLabel(account.status)}
              tint="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <Field
              icon={CalendarDays}
              label="Member Since"
              value={formatDate(account.createdAt)}
              tint="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
          </div>

          {/* Plan & usage — the running subscription and what's left of it. */}
          <section className="space-y-3">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Plan &amp; Usage
            </h2>
            <Card>
              <CardContent className="space-y-4 pt-5">
                {subscription ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CreditCard className="size-4 text-muted-foreground" />
                        {subscription.isYearly ? 'Yearly' : 'Monthly'} plan
                      </p>
                      <StatusPill
                        status={subscription.status}
                        tone={subscriptionStatusTone(subscription.status)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Current Period
                        </p>
                        <p className="mt-0.5 font-medium text-foreground">
                          {subscription.currentPeriodStart
                            ? `${formatDate(subscription.currentPeriodStart)} — ${formatDate(subscription.currentPeriodEnd)}`
                            : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Auto Renewal
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
                          <RefreshCw className="size-3.5 text-muted-foreground" />
                          {subscription.isAutopay ? 'On' : 'Off'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Entitlements
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
                          <BadgeCheck className="size-3.5 text-muted-foreground" />
                          {subscription.planPermissions.length} module
                          {subscription.planPermissions.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    {subscription.isCancel ? (
                      <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                        This plan is set to end at{' '}
                        {subscription.currentPeriodEnd
                          ? formatDate(subscription.currentPeriodEnd)
                          : 'the end of the current period'}{' '}
                        and will not renew.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active subscription on this account.
                  </p>
                )}

                {usage ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <UsageMeter
                      icon={Users}
                      label="Employees"
                      count={usage.employeeCount}
                      limit={usage.employeeLimit}
                    />
                    <UsageMeter
                      icon={Building2}
                      label="Companies"
                      count={usage.companyCount}
                      limit={usage.companyLimit}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>
        </div>
      ) : null}

      {/* Security — reads the session, not the profile query, so it stands
          outside the load/error branches above. */}
      <section className="mt-6 space-y-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Security
        </h2>
        <TwoFactorCard />
      </section>
    </div>
  )
}
