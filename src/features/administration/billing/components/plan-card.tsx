import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Crown,
  Gift,
  Headphones,
  Loader2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import { yearlySavingsPercent } from '../lib/billing-mappers'
import { PlanSlaDialog } from './plan-sla-dialog'
import type { Plan } from '../types'

/**
 * How a plan is dressed, by what KIND of plan it is — a trial, a bespoke build,
 * or an off-the-shelf tier.
 *
 * Keyed to the plan's own nature and never to its position in the grid, so
 * filtering or reordering the catalog can't repaint a card the reader has
 * already learned.
 */
interface PlanLook {
  icon: LucideIcon
  tint: string
}

function planLook(plan: Plan): PlanLook {
  if (plan.isTrial) {
    return { icon: Gift, tint: 'bg-warning/12 text-warning' }
  }
  if (plan.isCustom) {
    return { icon: Building2, tint: 'bg-chart-5/15 text-chart-5' }
  }
  return { icon: Crown, tint: 'bg-primary/12 text-primary' }
}

/** One allowance line — a tinted glyph, the number, then what it counts. */
function FeatureRow({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon
  value: string | number
  label: string
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span>
        <span className="font-semibold text-foreground">{value}</span>{' '}
        <span className="text-muted-foreground">{label}</span>
      </span>
    </li>
  )
}

/**
 * One plan in the comparison grid — its price on the chosen cycle, what it
 * allows, what it promises on support, and the button that buys it.
 *
 * Presentational only: it reports the click and renders the flags it's handed.
 * Whether the user may buy at all, and everything the purchase then does, is the
 * page's hook.
 */
export function PlanCard({
  plan,
  yearly,
  onPurchase,
  purchasing = false,
}: {
  plan: Plan
  /** Which cycle's price to show — the grid switches every card together. */
  yearly: boolean
  /** Omitted when the user may not buy — the card then has no button at all. */
  onPurchase?: (plan: Plan) => void
  /** A purchase is in flight somewhere in the grid; every card locks. */
  purchasing?: boolean
}) {
  const price = yearly ? plan.yearPrice : plan.monthPrice
  const perEmployee = yearly ? plan.yearPricePerEmployee : plan.monthPricePerEmployee
  const savings = yearlySavingsPercent(plan)
  const { icon: Icon, tint } = planLook(plan)

  /** Whether this card's support-response dialog is open. */
  const [slaOpen, setSlaOpen] = useState(false)

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-card transition-shadow hover:shadow-md',
        // The running plan is the reader's anchor — everything else in the grid
        // is read relative to it, so it's marked, not merely listed.
        plan.isActive
          ? 'border-primary shadow-sm ring-1 ring-primary/25'
          : 'border-border',
      )}
    >
      {plan.isActive && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
          Current Plan
        </span>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tint)}
          >
            <Icon className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-heading text-base font-semibold tracking-tight text-foreground">
                {plan.name}
              </p>
              {plan.isTrial && <Badge variant="warning">Trial</Badge>}
              {plan.isCustom && <Badge variant="outline">Custom</Badge>}
            </div>
            {plan.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {plan.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
            <span className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              {formatCurrency(price)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {yearly ? 'year' : 'month'}
            </span>
            {yearly && savings !== null && (
              <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success">
                Save {savings}%
              </span>
            )}
          </div>

          {/*
            The per-employee rate is the figure the total was quoted FROM, and is
            null on a flat-fee plan — stated as provenance, not as a rival price.
          */}
          {perEmployee !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Quoted at {formatCurrency(perEmployee)} per employee
            </p>
          )}

          {plan.isTrial && plan.trialDurationDays !== null && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-warning">
              <Gift className="size-3.5" />
              Free for {plan.trialDurationDays} days
            </p>
          )}
        </div>

        {/*
          `pb-6` is the breathing room between the last allowance and the
          support divider below — without it the rule sits tight against the
          text and the two blocks read as one.
        */}
        <ul className="mt-5 space-y-2.5 border-t border-border pb-6 pt-5">
          <FeatureRow
            icon={UsersRound}
            value={plan.maxEmployees}
            label="employees included"
          />
          <FeatureRow
            icon={Building2}
            value={plan.maxCompanies}
            label="companies included"
          />
          <FeatureRow
            icon={ShieldCheck}
            value={plan.planPermissions.length}
            label="permissions available"
          />
        </ul>

        {/*
          `mt-auto` pins this footer to the card's bottom edge so the support row
          and the buy button line up across a grid of cards with different
          amounts of content above them.
        */}
        <div className="mt-auto">
          {plan.supportSlas.length > 0 && (
            <button
              type="button"
              onClick={() => setSlaOpen(true)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border-t border-border px-1 pt-4 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Headphones className="size-3.5" />
                Support response
              </span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-primary">
                {plan.supportSlas.length} promise
                {plan.supportSlas.length === 1 ? '' : 's'}
                <ChevronRight className="size-3.5" />
              </span>
            </button>
          )}

          {onPurchase && (
            <Button
              type="button"
              className="mt-4 w-full"
              variant={plan.isActive ? 'outline' : 'default'}
              // The running plan can't be re-bought, and no card is clickable
              // while another one's purchase is mid-flight — two open orders for
              // the same account is not a state worth allowing.
              disabled={plan.isActive || purchasing}
              onClick={() => onPurchase(plan)}
            >
              {plan.isActive ? (
                'Current Plan'
              ) : purchasing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  {plan.isTrial ? 'Start Free Trial' : 'Choose Plan'}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <PlanSlaDialog
        plan={plan}
        open={slaOpen}
        onOpenChange={setSlaOpen}
      />
    </div>
  )
}
