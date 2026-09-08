import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Hint } from '@/components/common/hint'
import { formatChange } from '../lib/dashboard-format'

/**
 * A `change_pct` chip.
 *
 * Three things it gets right that the obvious version gets wrong:
 *
 * 1. **`change_pct` compares FLOWS, not totals**, and it is null when the
 *    PREVIOUS window was empty. Null reads "New" — never "+∞%", never "0%",
 *    which would claim no change where there was no baseline.
 * 2. **Colour follows whether UP IS GOOD for this metric**, not the sign. A fall
 *    in `net` or in `attrition_rate` is good news, and painting it red because
 *    the number went down is the difference between an HR dashboard and a growth
 *    dashboard.
 * 3. **It renders nothing under `all_time`.** There is no equally-long period
 *    before all of history, so the caller passes `show={false}` and the chip
 *    disappears rather than showing an em-dash that looks like missing data.
 */

interface DeltaBadgeProps {
  value: number | null
  /**
   * Whether a rise in this metric is good news. `false` for attrition and for a
   * cost the tenant wants down; the arrow still follows the sign, only the
   * colour flips.
   */
  upIsGood?: boolean
  /** False under `all_time`, where there is nothing to compare against. */
  show?: boolean
  /** Trailing words — "vs previous period", "over this period". */
  hint?: string
  className?: string
}

export function DeltaBadge({
  value,
  upIsGood = true,
  show = true,
  hint,
  className,
}: DeltaBadgeProps) {
  if (!show) return null

  // Null is "there was no previous window", which is a different statement from
  // "the number did not move".
  if (value == null) {
    return (
      <Hint text="No comparable period before this one">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground',
            className,
          )}
        >
          <Sparkles className="size-3" />
          New
          {hint ? <span className="font-normal">{hint}</span> : null}
        </span>
      </Hint>
    )
  }

  const flat = value === 0
  const rising = value > 0
  const good = flat ? undefined : rising === upIsGood

  const Icon = flat ? Minus : rising ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        good === undefined && 'text-muted-foreground',
        good === true && 'text-success',
        good === false && 'text-destructive',
        className,
      )}
    >
      <Icon className="size-3" />
      {formatChange(value)}
      {hint ? <span className="font-normal text-muted-foreground">{hint}</span> : null}
    </span>
  )
}
