import { MONTHLY_METRICS, STOCK_METRIC } from '../constants'
import type {
  DashboardSeries,
  MetricSeries,
  MetricUnit,
  SeriesMetric,
} from '../types'

/**
 * Reshaping `/series` for recharts, and the two rules that decide how.
 *
 * **1. Plot `cumulative` for headcount and `value` for everything else.**
 * `baseline` is non-zero for `headcount` alone, the one STOCK metric: its
 * `value` is the NET movement in the bucket, so the standing headcount is the
 * cumulative — and that can go DOWN, which is exactly what separates an HR chart
 * from a growth chart. Every other metric is a flow and plots its own value.
 *
 * **2. One chart per UNIT.** Hours beside a person count is a chart that lies
 * about scale, and a second Y axis only moves the lie: the alignment between two
 * scales is arbitrary, so the chart invents a correlation the data doesn't have.
 * Metrics are therefore grouped by `unit` and each group gets its own plot.
 */

/** One row per bucket, one column per metric — recharts' data shape. */
export type SeriesRow = Record<string, string | number>

/** Whether this metric's line is the standing total rather than the flow. */
export function isStockMetric(metric: SeriesMetric): boolean {
  return metric === STOCK_METRIC
}

/** The figure a metric plots: `cumulative` for the stock, `value` for a flow. */
export function plottedValue(
  metric: SeriesMetric,
  point: { value: number; cumulative: number },
): number {
  return isStockMetric(metric) ? point.cumulative : point.value
}

/**
 * Whether any selected metric lands on the 1st of a month whatever grain is
 * asked for. A salary sheet has no day, so a payroll metric on a daily axis puts
 * each month's whole cost on one spike — the panel asks for `month` instead.
 */
export function needsMonthlyGrain(metrics: readonly SeriesMetric[]): boolean {
  return metrics.some((metric) => MONTHLY_METRICS.includes(metric))
}

/** The series in a response, grouped by unit — one plot per group. */
export function groupByUnit(series: MetricSeries[]): { unit: MetricUnit; series: MetricSeries[] }[] {
  const groups = new Map<MetricUnit, MetricSeries[]>()
  for (const entry of series) {
    const existing = groups.get(entry.unit)
    if (existing) existing.push(entry)
    else groups.set(entry.unit, [entry])
  }
  return [...groups.entries()].map(([unit, entries]) => ({ unit, series: entries }))
}

/**
 * A unit group as rows keyed by bucket.
 *
 * Buckets come from the FIRST series in the group; every series in one response
 * is cut on the same buckets (which is why every line belongs in one request —
 * fetching them separately lets them land against slightly different clocks and
 * end up a bucket apart on the same axis).
 */
export function toSeriesRows(series: MetricSeries[]): SeriesRow[] {
  const [first] = series
  if (!first) return []

  return first.points.map((point, index) => {
    const row: SeriesRow = { bucket: point.bucket }
    for (const entry of series) {
      const at = entry.points[index]
      if (!at) continue
      row[entry.metric] = plottedValue(entry.metric, at)
    }
    return row
  })
}

/**
 * The floor a headcount area should sit on.
 *
 * `opening_headcount` is the headcount the instant the window opened, so an area
 * starting at zero implies the company was empty on day one of the range. Where
 * the stock series is present its `baseline` says the same thing, and it is the
 * figure that belongs to this exact response.
 */
export function stockBaseline(series: MetricSeries[]): number {
  return series.find((entry) => isStockMetric(entry.metric))?.baseline ?? 0
}

/** Whether every plotted point in the response is zero — a real empty state. */
export function isEmptySeries(response: DashboardSeries): boolean {
  return response.series.every((entry) =>
    entry.points.every((point) => plottedValue(entry.metric, point) === 0),
  )
}

/** How a plot draws its series. */
export type PlotMark = 'area' | 'line' | 'bar'

/** One chart: the series on it, their shared unit, and the mark they wear. */
export interface SeriesPlot {
  id: string
  unit: MetricUnit
  mark: PlotMark
  series: MetricSeries[]
  /**
   * True when the plot carries the STOCK metric, so its Y axis floors on the
   * standing headcount rather than on zero — an area starting at zero implies
   * the company was empty on day one of the range.
   */
  isStock: boolean
}

/**
 * The plots a response should be drawn as.
 *
 * Two splits happen, and both exist to keep one Y axis honest:
 *
 * 1. **By unit.** Hours beside a person count is a chart that lies about scale,
 *    and a second Y axis only moves the lie — the alignment between two scales
 *    is arbitrary, so the plot invents a correlation the data doesn't have.
 * 2. **Stock apart from its flows.** A standing headcount of 250 and five joins
 *    share the unit `count` but not the magnitude: on one axis the flow bars
 *    would be invisible. They answer different questions anyway — the level, and
 *    the movement in it — so they get a chart each.
 */
export function toPlots(series: MetricSeries[], flowMark: PlotMark = 'line'): SeriesPlot[] {
  const plots: SeriesPlot[] = []

  for (const { unit, series: group } of groupByUnit(series)) {
    const stock = group.filter((entry) => isStockMetric(entry.metric))
    const flows = group.filter((entry) => !isStockMetric(entry.metric))

    if (stock.length) {
      plots.push({ id: `${unit}-stock`, unit, mark: 'area', series: stock, isStock: true })
    }
    if (flows.length) {
      plots.push({ id: `${unit}-flow`, unit, mark: flowMark, series: flows, isStock: false })
    }
  }

  return plots
}
