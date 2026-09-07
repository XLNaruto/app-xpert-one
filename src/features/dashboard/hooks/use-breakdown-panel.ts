import { useCallback, useMemo, useState } from 'react'
import { BREAKDOWN_LIMIT, DONUT_LIMIT, type BreakdownChartShape } from '../constants'
import { useDashboardBreakdown } from '../api/use-dashboard-panels'
import {
  dimensionsForMeasure,
  isValidPair,
  orderedItems,
  topNamedItem,
} from '../lib/breakdown-shape'
import { BREAKDOWN_DIMENSION_LABELS } from '../constants'
import type { DashboardQuery } from '../lib/dashboard-query'
import type { BreakdownDimension, BreakdownMeasure } from '../types'

/**
 * One breakdown panel: a measure, a dimension, and a chart shape.
 *
 * The shape costs no extra request — every item carries `value` AND
 * `previous_value`, so a plain bar, a donut and a grouped "vs previous" column
 * chart all come out of the response already in hand.
 *
 * **The dimension list is re-filtered when the measure changes.** An unresolvable
 * pair is a 400 whose message names the dimensions that measure does accept;
 * preventing it is better than surfacing it, so a measure change that orphans
 * the current dimension snaps to the first one that still works.
 */

export interface BreakdownPanelOptions {
  baseQuery: DashboardQuery
  measure?: BreakdownMeasure
  dimension?: BreakdownDimension
  shape?: BreakdownChartShape
  /**
   * Slices to name before the rest folds into `__other__`. Omit to let the
   * SHAPE decide — a donut needs a hue per wedge and so names far fewer.
   */
  limit?: number
}

export function useBreakdownPanel({
  baseQuery,
  measure: initialMeasure = 'headcount',
  dimension: initialDimension = 'department',
  shape: initialShape = 'bar',
  limit,
}: BreakdownPanelOptions) {
  const [measure, setMeasureState] = useState<BreakdownMeasure>(initialMeasure)
  const [dimension, setDimension] = useState<BreakdownDimension>(initialDimension)
  const [shape, setShape] = useState<BreakdownChartShape>(initialShape)

  const dimensionOptions = useMemo(
    () =>
      dimensionsForMeasure(measure).map((value) => ({
        label: BREAKDOWN_DIMENSION_LABELS[value],
        value,
      })),
    [measure],
  )

  /**
   * Changing the measure may orphan the dimension — `leave_type` means nothing
   * to `headcount`. Snap to the first dimension the new measure accepts (always
   * `company`, since the common family works with every measure) rather than
   * letting the request 400.
   */
  const setMeasure = useCallback(
    (next: BreakdownMeasure) => {
      setMeasureState(next)
      setDimension((current) => {
        if (isValidPair(next, current)) return current
        const [first] = dimensionsForMeasure(next)
        return first ?? 'company'
      })
    },
    [],
  )

  const pairIsValid = isValidPair(measure, dimension)

  /*
   * The donut names fewer slices than the bar, because each wedge needs its own
   * categorical hue and there are five, never cycled. Toggling the shape
   * therefore re-requests — which is the point: folding the tail differently is
   * exactly what makes the donut readable, and the wedges still sum to `total`
   * because the remainder lands in `__other__` either way.
   */
  const effectiveLimit = limit ?? (shape === 'donut' ? DONUT_LIMIT : BREAKDOWN_LIMIT)

  const query = useMemo<DashboardQuery>(
    () => ({ ...baseQuery, measure, dimension, limit: effectiveLimit }),
    [baseQuery, measure, dimension, effectiveLimit],
  )

  const result = useDashboardBreakdown(query, pairIsValid)

  // Re-sorted for `age_band` / `tenure_band`, whose response order is by size —
  // and an age histogram running 25-34, 45-54, 18-24 is not a histogram.
  const items = useMemo(
    () => (result.data ? orderedItems(result.data) : []),
    [result.data],
  )

  return {
    ...result,
    measure,
    setMeasure,
    dimension,
    setDimension,
    dimensionOptions,
    shape,
    setShape,
    items,
    /** The biggest slice, reserved keys excluded — for a "top" callout. */
    top: result.data ? topNamedItem(result.data) : undefined,
  }
}
