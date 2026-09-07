import { OTHER_KEY, RESERVED_KEYS, UNASSIGNED_KEY } from '../constants'
import type { BreakdownItem, DashboardBreakdown } from '../types'

/**
 * Turning one `/breakdown` response into the four chart shapes it feeds, and
 * keeping the two reserved keys honest.
 *
 * `__other__` and `__unassigned__` are never dropped. `__other__` exists
 * precisely so the slices still sum to `total` — a donut whose wedges add up to
 * less than the number in its middle is a bug report — and `__unassigned__` is
 * a legitimate value, because branch, department and designation are optional in
 * this product. Both are coloured neutral, `__unassigned__` sorts last whatever
 * its size, and neither is ever a "top performer".
 */

/** Whether a slice is one of the two reserved keys. */
export function isReservedKey(key: string): boolean {
  return RESERVED_KEYS.includes(key)
}

export function isUnassigned(key: string): boolean {
  return key === UNASSIGNED_KEY
}

export function isOther(key: string): boolean {
  return key === OTHER_KEY
}

/**
 * The slices in the order they should be DRAWN.
 *
 * The response is already sorted biggest-first, and that order is kept — there
 * are no band dimensions left to re-sort now that the six are all org facets.
 *
 * The two reserved keys are moved to the end: `__unassigned__` sorts LAST
 * whatever its size, and `__other__` sits just before it. They are the two
 * slices a reader should reach at the end of the list, not in the middle of it —
 * and neither is ever dropped, because `__other__` is what keeps the slices
 * summing to `total`.
 */
export function orderedItems(breakdown: DashboardBreakdown): BreakdownItem[] {
  return [
    ...breakdown.items.filter((item) => !isReservedKey(item.key)),
    ...breakdown.items.filter((item) => isOther(item.key)),
    ...breakdown.items.filter((item) => isUnassigned(item.key)),
  ]
}

/**
 * The biggest NAMED slice — the one a "top" callout may mention.
 *
 * Both reserved keys are excluded: "Other (7)" is not a department and
 * "Unassigned" is not a team, so neither can be the top performer.
 */
export function topNamedItem(breakdown: DashboardBreakdown): BreakdownItem | undefined {
  return breakdown.items
    .filter((item) => !isReservedKey(item.key))
    .reduce<BreakdownItem | undefined>(
      (best, item) => (best === undefined || item.value > best.value ? item : best),
      undefined,
    )
}

/** Whether every slice is zero — a real "no data yet", not a failure. */
export function isEmptyBreakdown(breakdown: DashboardBreakdown): boolean {
  return breakdown.items.length === 0 || breakdown.items.every((item) => item.value === 0)
}
