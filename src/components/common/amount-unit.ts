import type { ComponentType } from 'react'
import { CalendarDays, IndianRupee, Percent, Sun } from 'lucide-react'
import type { AllowanceValueType } from '@/features/master/designation'

/**
 * The four units a head's amount can be entered in, as the screens draw them.
 *
 * Its own module rather than part of `wage-grid-fields` so that both the grid's
 * `UnitAmountField` and the designation form's larger `ValueTypeButton` read one
 * table — two screens tinting or naming the same unit differently is exactly the
 * confusion `Per Day` and `Days` don't need any more of.
 */

/**
 * How each of the four units is drawn, and what pressing the toggle moves to.
 *
 * The toggle cycles rather than opening a menu: a grid cell has room for one
 * 24px button and four options, and the order below is the order they were added
 * — percentage, flat monthly, day rate, day count. Each has its own icon and its
 * own tint, because `Per Day` and `Days` are the pair that gets confused and a
 * shared "rupee" mark would hide exactly the difference that matters.
 */
export const UNIT_META: Record<
  AllowanceValueType,
  { icon: ComponentType<{ className?: string }>; tone: string; label: string }
> = {
  Percentage: {
    icon: Percent,
    tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400',
    label: 'a percentage',
  },
  Fixed: {
    icon: IndianRupee,
    tone: 'border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400',
    label: 'a fixed monthly amount',
  },
  'Per Day': {
    icon: Sun,
    tone: 'border-sky-500/20 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:text-sky-400',
    label: 'a rate per day',
  },
  Days: {
    icon: CalendarDays,
    tone: 'border-violet-500/20 bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400',
    label: 'a number of days',
  },
}

/** The cycle order of the unit toggle. */
const UNIT_CYCLE: AllowanceValueType[] = ['Percentage', 'Fixed', 'Per Day', 'Days']

/** The unit after this one, wrapping — what one press of the toggle lands on. */
export function nextUnit(current: AllowanceValueType): AllowanceValueType {
  const at = UNIT_CYCLE.indexOf(current)
  return UNIT_CYCLE[(at + 1) % UNIT_CYCLE.length]
}

