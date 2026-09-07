import { useCallback, useMemo, useState } from 'react'
import { CALENDAR_ONLY_METRICS, HEATMAP_METRIC_LABELS } from '../constants'
import { useDashboardHeatmap } from '../api/use-dashboard-panels'
import { toHeatmapGrid } from '../lib/heatmap-shape'
import type { DashboardQuery } from '../lib/dashboard-query'
import type { HeatmapMetric, HeatmapShape } from '../types'

/**
 * The heatmap panel: a shape, a metric, and the one invalid pair between them.
 *
 * `leave_days` is CALENDAR-ONLY — a leave application has dates and no clock, so
 * it answers 400 on the weekday/hour grid. The metric dropdown disables it while
 * the grid is selected, and switching to the grid while it is chosen falls back
 * to check-ins rather than firing a request that cannot succeed.
 */

export function useHeatmapPanel(
  baseQuery: DashboardQuery,
  initialShape: HeatmapShape = 'weekday_hour',
  initialMetric: HeatmapMetric = 'check_ins',
) {
  const [shape, setShapeState] = useState<HeatmapShape>(initialShape)
  const [metric, setMetric] = useState<HeatmapMetric>(initialMetric)

  const metricUnavailable = shape === 'weekday_hour' && CALENDAR_ONLY_METRICS.includes(metric)

  const setShape = useCallback((next: HeatmapShape) => {
    setShapeState(next)
    if (next === 'weekday_hour') {
      setMetric((current) =>
        CALENDAR_ONLY_METRICS.includes(current) ? 'check_ins' : current,
      )
    }
  }, [])

  /** Metric choices for the shape in hand — calendar-only ones are disabled. */
  const metricOptions = useMemo(
    () =>
      (Object.keys(HEATMAP_METRIC_LABELS) as HeatmapMetric[]).map((value) => ({
        label: HEATMAP_METRIC_LABELS[value],
        value,
        disabled: shape === 'weekday_hour' && CALENDAR_ONLY_METRICS.includes(value),
      })),
    [shape],
  )

  const query = useMemo<DashboardQuery>(
    () => ({ ...baseQuery, shape, metric }),
    [baseQuery, shape, metric],
  )

  const result = useDashboardHeatmap(query, !metricUnavailable)

  // Laid out from the axis definitions, not from arrival order — the grid is
  // always complete, and a sparse read would shift every following cell.
  const grid = useMemo(
    () => (result.data ? toHeatmapGrid(result.data) : undefined),
    [result.data],
  )

  return {
    ...result,
    shape,
    setShape,
    metric,
    setMetric,
    metricOptions,
    grid,
  }
}
