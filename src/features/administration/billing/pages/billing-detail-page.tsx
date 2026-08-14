import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Building2, CreditCard, Mail, Phone, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import { Forbidden } from '@/features/error'
import { BILLING_LABELS } from '../constants'
import { useBillingOverview } from '../hooks/use-billing-overview'
import { usePlanPurchase } from '../hooks/use-plan-purchase'
import { CurrentPlanCard } from '../components/current-plan-card'
import { PlanUsageMeters } from '../components/plan-usage-meters'
import { PlanCard } from '../components/plan-card'
import { BillingCycleToggle } from '../components/billing-cycle-toggle'

/** One billing contact — a tinted glyph, its label, and the value beneath. */
function BilledToItem({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: LucideIcon
  tint: string
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tint)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  )
}

/**
 * Billing & Subscription — what the account is on, how much of it is being used,
 * what else could be bought, and the buying of it.
 *
 * A purchase raises an order (`POST /user/subscriptions`) and hands it to the
 * payment sheet; `usePlanPurchase` owns that sequence, and this page only shows
 * it. Layout only — every decision here comes from a hook.
 */
export function BillingDetailPage() {
  const {
    account,
    subscription,
    currentPlan,
    plans,
    usageBars,
    savingsPercent,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
  } = useBillingOverview()

  /**
   * Which cycle the whole grid quotes.
   *
   * Null means "not chosen yet", which follows the account's own cycle — the
   * comparison then starts from a number the reader recognises. Seeding state
   * from `subscription` directly wouldn't work: it's still loading on the first
   * render, so the grid would stick on monthly for a yearly account.
   */
  const [cycle, setCycle] = useState<boolean | null>(null)
  const yearly = cycle ?? subscription?.isYearly ?? false
  const setYearly = (next: boolean) => setCycle(next)

  const {
    canPurchase,
    pendingPlan,
    requestPurchase,
    cancelPurchase,
    confirmPurchase,
    isPurchasing,
  } = usePlanPurchase({ account, yearly })

  /** What the plan awaiting confirmation costs on the cycle being bought. */
  const pendingPrice = pendingPlan
    ? formatCurrency(yearly ? pendingPlan.yearPrice : pendingPlan.monthPrice)
    : null

  // Reading billing was refused — show the 403 screen, not an empty panel.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="Billing & Subscription"
        description="Your plan, what it allows, and how much of it you're using."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "Couldn't load your billing details."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <CurrentPlanCard subscription={subscription} plan={currentPlan} />

          <PlanUsageMeters bars={usageBars} />

          {account && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Billed to
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <BilledToItem
                    icon={Building2}
                    tint="bg-primary/10 text-primary"
                    label={BILLING_LABELS.organization}
                    value={account.organizationName}
                  />
                  <BilledToItem
                    icon={Mail}
                    tint="bg-chart-2/15 text-chart-2"
                    label="Email"
                    value={account.organizationEmail}
                  />
                  <BilledToItem
                    icon={Phone}
                    tint="bg-success/12 text-success"
                    label="Mobile"
                    value={account.organizationMobileNumber}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {plans.length > 0 && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold tracking-tight">
                    Available Plans
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {canPurchase
                      ? 'Compare what each plan allows, then pick the one you want.'
                      : 'Compare what each plan allows. To change plans, get in touch with us.'}
                  </p>
                </div>

                {/*
                  One switch for the whole grid — comparing a monthly price
                  against a yearly one is the mistake this prevents.
                */}
                <BillingCycleToggle
                  yearly={yearly}
                  onChange={setYearly}
                  savingsPercent={savingsPercent}
                />
              </div>

              {/*
                `items-start` would let a short card shrink; stretching keeps
                every card the same height so the price rows line up across the
                row, which is the whole point of a comparison grid. The top
                padding is headroom for the "Current Plan" ribbon, which sits
                above its card's edge and would otherwise clash with the heading.
              */}
              <div className="grid grid-cols-1 items-stretch gap-5 pt-3 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    yearly={yearly}
                    onPurchase={canPurchase ? requestPurchase : undefined}
                    purchasing={isPurchasing}
                  />
                ))}
              </div>
            </div>
          )}

          {plans.length === 0 && !subscription && (
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Sparkles className="size-4" />
                </span>
                <p className="text-sm text-muted-foreground">
                  No plans are available for this account yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/*
        The confirmation names the price and the cycle because the grid's toggle
        can be flipped after a card was read — this is the last point the two
        are stated together before an order is raised.

        `keepOpenOnConfirm` leaves it up while the order call is in flight: the
        hook closes it once the order exists, so a failure stays on the dialog
        the user can retry from rather than dropping them back to the grid.
      */}
      <ConfirmDialog
        open={pendingPlan !== null}
        onOpenChange={(open) => {
          if (!open) cancelPurchase()
        }}
        onConfirm={confirmPurchase}
        keepOpenOnConfirm
        loading={isPurchasing}
        icon={CreditCard}
        title={pendingPlan ? `Subscribe to ${pendingPlan.name}?` : 'Subscribe?'}
        description={
          pendingPlan &&
          (pendingPlan.isTrial && pendingPlan.trialDurationDays !== null ? (
            <>
              {pendingPlan.name} is free for {pendingPlan.trialDurationDays} days,
              then {pendingPrice} per {yearly ? 'year' : 'month'}.
            </>
          ) : (
            <>
              You'll be charged {pendingPrice} per {yearly ? 'year' : 'month'}.
              We'll take you to the payment page to complete it.
            </>
          ))
        }
        confirmLabel="Continue to payment"
      />
    </div>
  )
}
