import {
  CalendarClock,
  CircleAlert,
  CreditCard,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { BILLING_LABELS } from '../constants'
import {
  periodProgress,
  subscriptionStatusLabel,
  subscriptionStatusVariant,
} from '../lib/billing-mappers'
import type { Plan, Subscription } from '../types'

/** One fact under the hero — label above, value below, all on one baseline. */
function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

/**
 * The running subscription, as the screen's hero: which plan, on which cycle, at
 * which price, and how far through the paid period it is.
 *
 * The price shown is the SUBSCRIPTION's, not the catalog's — a plan bought last
 * year isn't paying this year's rate, and quoting today's number on a record of
 * what's being charged would simply be wrong.
 */
export function CurrentPlanCard({
  subscription,
  plan,
}: {
  subscription: Subscription | null
  /** The catalog entry behind it, for the plan's name and description. */
  plan: Plan | null
}) {
  if (!subscription) {
    return (
      <Card>
        <CardContent className="p-5">
          <EmptyState
            icon={Sparkles}
            title="No active subscription"
            description="This account isn't on a plan yet. Compare the plans below and contact us to get started."
          />
        </CardContent>
      </Card>
    )
  }

  const price = subscription.isYearly
    ? subscription.yearPrice
    : subscription.monthPrice
  const perEmployee = subscription.isYearly
    ? subscription.yearPricePerEmployee
    : subscription.monthPricePerEmployee
  const period = periodProgress(subscription)
  const renews = subscription.isAutopay && !subscription.isCancel

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-linear-to-r from-primary/10 via-primary/5 to-transparent">
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <CreditCard className="size-6" />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                  {plan?.name ?? `Plan #${subscription.planId}`}
                </h2>
                <Badge variant={subscriptionStatusVariant(subscription.status)}>
                  {subscriptionStatusLabel(subscription.status)}
                </Badge>
                {plan?.isTrial && <Badge variant="warning">Trial</Badge>}
                {plan?.isCustom && <Badge variant="outline">Custom</Badge>}
              </div>

              {plan?.description && (
                <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                  {plan.description}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              {price === null ? '—' : formatCurrency(price)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              per {subscription.isYearly ? 'year' : 'month'}
            </p>
            {/*
              The per-employee rate is the figure the total was quoted FROM, and
              is null on a flat-fee plan — stated as provenance, not as a second
              price competing with the one above it.
            */}
            {perEmployee !== null && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(perEmployee)} per employee
              </p>
            )}
          </div>
        </div>

        {period && (
          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current period
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {period.daysLeft}
                </span>{' '}
                {period.daysLeft === 1 ? 'day' : 'days'}{' '}
                {renews ? 'until renewal' : 'remaining'}
              </p>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${period.percent}%` }}
              />
            </div>

            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>
                {subscription.currentPeriodStart
                  ? formatDate(subscription.currentPeriodStart)
                  : '—'}
              </span>
              <span>
                {subscription.currentPeriodEnd
                  ? formatDate(subscription.currentPeriodEnd)
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          'grid grid-cols-2 gap-4 border-t border-border bg-card/60 px-6 py-4 sm:grid-cols-4',
        )}
      >
        <HeroFact
          label={BILLING_LABELS.billingCycle}
          value={subscription.isYearly ? 'Yearly' : 'Monthly'}
        />
        <HeroFact
          label={BILLING_LABELS.startedOn}
          value={
            subscription.currentPeriodStart
              ? formatDate(subscription.currentPeriodStart)
              : 'N/A'
          }
        />
        <HeroFact
          // Whether the end date is a renewal or an expiry depends entirely on
          // auto-renew, so the label says which one it is.
          label={renews ? BILLING_LABELS.renewsOn : BILLING_LABELS.endsOn}
          value={
            subscription.currentPeriodEnd
              ? formatDate(subscription.currentPeriodEnd)
              : 'N/A'
          }
        />
        <HeroFact
          label={BILLING_LABELS.autopay}
          value={subscription.isAutopay ? 'On' : 'Off'}
        />
      </div>

      {subscription.isCancel && (
        <p className="flex items-start gap-2 border-t border-warning/30 bg-warning/10 px-6 py-3 text-xs text-warning">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          This subscription is set to cancel. It stays active until the end of the
          current period and won't renew after that.
        </p>
      )}

      {!subscription.isAutopay && !subscription.isCancel && (
        <p className="flex items-start gap-2 border-t border-border bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
          <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
          Auto-renew is off — this plan needs renewing manually before the period
          ends.
        </p>
      )}

      {renews && (
        <p className="flex items-start gap-2 border-t border-border bg-card/60 px-6 py-3 text-xs text-muted-foreground">
          <RefreshCw className="mt-0.5 size-3.5 shrink-0" />
          Renews automatically on{' '}
          {subscription.currentPeriodEnd
            ? formatDate(subscription.currentPeriodEnd)
            : 'the period end date'}
          .
        </p>
      )}
    </div>
  )
}
