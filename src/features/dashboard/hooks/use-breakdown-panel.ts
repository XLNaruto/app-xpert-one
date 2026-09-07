import { useMemo, useState } from 'react'
import {
  BREAKDOWN_DIMENSION_OPTIONS,
  BREAKDOWN_LIMIT,
  DONUT_LIMIT,
  type BreakdownChartShape,
} from '../constants'
import { useDashboardBreakdown } from '../api/use-dashboard-panels'
import { orderedItems, topNamedItem } from '../lib/breakdown-shape'
import type { DashboardQuery } from '../lib/dashboard-query'
import type { BreakdownDimension, BreakdownMeasure } from '../types'

/**
 * One breakdown panel: a measure, a dimension, and a chart shape.
 *
 * The shape costs no extra request — every item carries `value` AND
 * `previous_value`, so a plain bar, a donut and a grouped "vs previous" column
 * chart all come out of the response already in hand.
 *
 * **EVERY MEASURE PAIRS WITH EVERY DIMENSION.** All six dimensions are the key
 * of the nightly cube each measure reads, so there is no unresolvable pair to
 * guard against and the dropdown never re-filters — changing the measure leaves
 * the dimension exactly where the user put it.
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
  const [measure, setMeasure] = useState<BreakdownMeasure>(initialMeasure)
  const [dimension, setDimension] = useState<BreakdownDimension>(initialDimension)
  const [shape, setShape] = useState<BreakdownChartShape>(initialShape)

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

  const result = useDashboardBreakdown(query)

  // Biggest-first as the response sent them, with the two reserved keys moved
  // to the end — never dropped, or the slices stop summing to `total`.
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
    dimensionOptions: BREAKDOWN_DIMENSION_OPTIONS,
    shape,
    setShape,
    items,
    /** The biggest slice, reserved keys excluded — for a "top" callout. */
    top: result.data ? topNamedItem(result.data) : undefined,
  }
}
