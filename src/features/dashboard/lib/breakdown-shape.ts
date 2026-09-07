import {
  COMMON_DIMENSIONS,
  FACT_LOCAL_DIMENSIONS,
  ORDERED_BANDS,
  OTHER_KEY,
  RESERVED_KEYS,
  UNASSIGNED_KEY,
} from '../constants'
import type {
  BreakdownDimension,
  BreakdownItem,
  BreakdownMeasure,
  DashboardBreakdown,
} from '../types'

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
 * Dimensions the chosen measure can actually be split by.
 *
 * A pair that doesn't resolve answers 400, so the dropdown is re-filtered when
 * the measure changes: the common dimensions always (every fact hangs off an
 * employee, and every employee has a posting), plus the ones local to that
 * measure's own fact table.
 */
export function dimensionsForMeasure(
  measure: BreakdownMeasure,
): readonly BreakdownDimension[] {
  return [...COMMON_DIMENSIONS, ...FACT_LOCAL_DIMENSIONS[measure]]
}

/** Whether the measure/dimension pair the screen holds can be requested at all. */
export function isValidPair(
  measure: BreakdownMeasure,
  dimension: BreakdownDimension,
): boolean {
  return dimensionsForMeasure(measure).includes(dimension)
}

/**
 * The slices in the order they should be DRAWN.
 *
 * `age_band` and `tenure_band` come back biggest-slice-first like everything
 * else, and an age histogram running 25-34, 45-54, 18-24 is not a histogram — so
 * those two are re-sorted into their canonical band order. Every other dimension
 * keeps the response's order, which is already biggest-first.
 *
 * `__unassigned__` sorts LAST in both cases, and `__other__` sits just before
 * it: they are the two slices a reader should reach at the end of the list, not
 * in the middle of it.
 */
export function orderedItems(breakdown: DashboardBreakdown): BreakdownItem[] {
  const bands = ORDERED_BANDS[breakdown.dimension]

  const named = breakdown.items.filter((item) => !isReservedKey(item.key))
  const other = breakdown.items.filter((item) => isOther(item.key))
  const unassigned = breakdown.items.filter((item) => isUnassigned(item.key))

  const ordered = bands
    ? [...named].sort((a, b) => {
        const ai = bands.indexOf(a.label)
        const bi = bands.indexOf(b.label)
        // A band the canonical list doesn't name falls to the end rather than to
        // the front, which is what `indexOf`'s -1 would otherwise do.
        return (ai === -1 ? bands.length : ai) - (bi === -1 ? bands.length : bi)
      })
    : named

  return [...ordered, ...other, ...unassigned]
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
