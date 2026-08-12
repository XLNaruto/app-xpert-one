import type { LucideIcon } from 'lucide-react'
import { Building2, CircleAlert, CircleCheck, TriangleAlert, UsersRound } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { USAGE_TONE_LABELS } from '../constants'
import type { UsageBar } from '../lib/billing-mappers'

/**
 * How each tone paints AND what it says. The label and icon are not decoration:
 * a red bar and an amber one are the same bar to a colourblind reader, so the
 * state is spelled out rather than left to the fill.
 */
const TONE: Record<
  UsageBar['tone'],
  { bar: string; text: string; pill: string; icon: LucideIcon }
> = {
  normal: {
    bar: 'bg-primary',
    text: 'text-foreground',
    pill: 'bg-success/12 text-success',
    icon: CircleCheck,
  },
  warning: {
    bar: 'bg-warning',
    text: 'text-warning',
    pill: 'bg-warning/15 text-warning',
    icon: TriangleAlert,
  },
  danger: {
    bar: 'bg-destructive',
    text: 'text-destructive',
    pill: 'bg-destructive/12 text-destructive',
    icon: CircleAlert,
  },
}

const ICONS: LucideIcon[] = [UsersRound, Building2]

/**
 * What the plan allows against what the account is using.
 *
 * Hitting a limit blocks the next employee or company outright, so the meter
 * turns before the wall rather than at it — an account at 80% is told, not left
 * to discover it mid-onboarding.
 */
export function PlanUsageMeters({ bars }: { bars: UsageBar[] }) {
  if (!bars.length) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {bars.map((bar, index) => {
        const Icon = ICONS[index] ?? UsersRound
        const tone = TONE[bar.tone]
        const ToneIcon = tone.icon
        const hasLimit = bar.limit > 0
        const remaining = Math.max(0, bar.limit - bar.count)

        return (
          <Card key={bar.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <p className="text-sm font-medium text-foreground">{bar.label}</p>
                </div>

                {hasLimit && (
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      tone.pill,
                    )}
                  >
                    <ToneIcon className="size-3" />
                    {USAGE_TONE_LABELS[bar.tone]}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'font-heading text-3xl font-semibold tracking-tight',
                    tone.text,
                  )}
                >
                  {bar.count}
                </span>
                <span className="text-sm text-muted-foreground">
                  {/* A limit of 0 means the plan states none, not "none allowed". */}
                  of {hasLimit ? bar.limit : '—'}
                </span>
                {hasLimit && (
                  <span className="ml-auto text-xs font-medium text-muted-foreground">
                    {bar.percent}%
                  </span>
                )}
              </div>

              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    tone.bar,
                  )}
                  style={{ width: `${hasLimit ? bar.percent : 0}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {!hasLimit
                  ? 'This plan states no limit.'
                  : bar.tone === 'danger'
                    ? `Limit reached — no more ${bar.label.toLowerCase()} can be added on this plan.`
                    : `${remaining} ${remaining === 1 ? bar.label.toLowerCase().replace(/s$/, '') : bar.label.toLowerCase()} remaining`}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
