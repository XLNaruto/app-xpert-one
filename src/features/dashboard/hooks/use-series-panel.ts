import { useCallback, useMemo, useState } from 'react'
import { useDashboardSeries } from '../api/use-dashboard-panels'
import {
  needsMonthlyGrain,
  stockBaseline,
  toPlots,
  type PlotMark,
  type SeriesPlot,
} from '../lib/series-shape'
import type { DashboardQuery } from '../lib/dashboard-query'
import type { Granularity, SeriesMetric } from '../types'

/**
 * One trend panel: the metrics it plots, the grain it asks for, and the request
 * that follows from both.
 *
 * **Every line comes from ONE request.** A chart with two lines is one chart —
 * fetching the lines separately lets them land against slightly different clocks
 * and end up a bucket apart on the same axis.
 *
 * **The grain is a request, not a promise.** Under `all_time` the server
 * escalates day → week → month so the chart stays drawable, so the panel labels
 * its axis from `response.granularity` and never from `requestedGranularity`.
 */

export interface SeriesPanelOptions {
  /** The shared population + window query every panel starts from. */
  baseQuery: DashboardQuery
  /** Metrics the panel opens with. */
  metrics: readonly SeriesMetric[]
  /** Grain the panel opens on. */
  granularity?: Granularity
  /** Whether the grain picker is offered at all (payroll pins itself to month). */
  lockGranularity?: boolean
  /** The mark the FLOW series wear — the stock is always an area. */
  flowMark?: PlotMark
}

export function useSeriesPanel({
  baseQuery,
  metrics: initialMetrics,
  granularity: initialGranularity = 'day',
  lockGranularity = false,
  flowMark = 'line',
}: SeriesPanelOptions) {
  const [metrics, setMetrics] = useState<SeriesMetric[]>(() => [...initialMetrics])
  const [granularity, setGranularity] = useState<Granularity>(initialGranularity)

  /*
   * A salary sheet has no day, so at `granularity=day` each month's whole cost
   * sits on the 1st — a line that reads as volatility rather than as monthly
   * cost. Selecting a payroll metric therefore forces the monthly grain rather
   * than drawing the spikes.
   */
  const forcedMonthly = needsMonthlyGrain(metrics)
  const requestedGranularity: Granularity = forcedMonthly ? 'month' : granularity

  const query = useMemo<DashboardQuery>(
    () => ({
      ...baseQuery,
      granularity: requestedGranularity,
      metrics: metrics.join(','),
    }),
    [baseQuery, requestedGranularity, metrics],
  )

  const result = useDashboardSeries(query, metrics.length > 0)

  /*
   * One chart per unit, and the stock metric on a chart of its own — see
   * `toPlots`. Never a dual axis: the alignment between two scales is arbitrary,
   * so a two-scale plot invents a correlation the data doesn't have.
   */
  const plots = useMemo<SeriesPlot[]>(
    () => (result.data ? toPlots(result.data.series, flowMark) : []),
    [result.data, flowMark],
  )

  /**
   * A metric's palette slot, taken from its position in the RESPONSE's series
   * list rather than from its position within its own plot.
   *
   * The panel may draw several charts (one per unit, and the stock apart from
   * its flows), and indexing per plot would give `present_days` and
   * `late_arrivals` the same hue on two charts in the same card. Colour follows
   * the metric, so a reader who learned "leave days is green" stays right when a
   * metric is toggled off and the plots re-split.
   */
  const colorIndexOf = useCallback(
    (metric: SeriesMetric) => {
      const index = result.data?.series.findIndex((entry) => entry.metric === metric) ?? -1
      return index < 0 ? 0 : index
    },
    [result.data],
  )

  return {
    ...result,
    metrics,
    setMetrics,
    colorIndexOf,
    /** The grain the panel ASKED for — for the picker's own value. */
    requestedGranularity,
    /** The grain the response came back with — what the axis is labelled from. */
    granularity: result.data?.granularity ?? requestedGranularity,
    /** True while a payroll metric is pinning the panel to a monthly grain. */
    forcedMonthly,
    canChooseGranularity: !lockGranularity && !forcedMonthly,
    setGranularity,
    plots,
    /** The headcount area's FLOOR — starting at zero implies an empty company. */
    baseline: result.data ? stockBaseline(result.data.series) : 0,
  }
}
