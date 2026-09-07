import { useMemo } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Combobox } from '@/components/ui/combobox'
import { axisProps, chartColor, tooltipStyle } from '@/components/charts/tokens'
import {
  GRANULARITY_OPTIONS,
  SERIES_METRIC_LABELS,
  TREND_METRIC_OPTIONS,
  UNIT_LABELS,
} from '../constants'
import {
  formatBucketFull,
  formatBucketTick,
  formatByUnit,
  formatTickByUnit,
  granularityAxisLabel,
} from '../lib/dashboard-format'
import { isEmptySeries, toSeriesRows, type SeriesPlot } from '../lib/series-shape'
import type { useSeriesPanel } from '../hooks/use-series-panel'
import type { Granularity, MetricUnit, SeriesMetric } from '../types'
import { PanelCard } from './panel-card'

/**
 * A trend panel: one chart per plot the hook produced.
 *
 * Four things this component is careful about:
 *
 * 1. **The axis is labelled from `response.granularity`**, never from the grain
 *    the panel asked for. Under `all_time` the server escalates day → week →
 *    month so the chart stays drawable, and a daily label on monthly buckets is
 *    a lie.
 * 2. **A bucket is a plain calendar date and is never parsed as a `Date`.** The
 *    string is already correct in the requested timezone; re-reading it in the
 *    browser's zone shifts a Monday's punches onto Sunday.
 * 3. **Zero buckets are plotted.** Every bucket comes back, quiet ones as
 *    `value: 0`, and filtering them out is exactly what makes a line interpolate
 *    across an empty week and draw a trend that never happened.
 * 4. **A headcount area floors on the standing headcount**, not on zero —
 *    starting at zero implies the company was empty on day one of the range.
 */

interface SeriesPanelProps {
  title: string
  description: string
  panel: ReturnType<typeof useSeriesPanel>
  /** Show the metric multi-select in the header. */
  allowMetricChoice?: boolean
  height?: number
}

export function SeriesPanel({
  title,
  description,
  panel,
  allowMetricChoice = false,
  height = 260,
}: SeriesPanelProps) {
  const { data, granularity, plots } = panel

  /*
   * The metric picker is clearable, so the user can empty it. That holds the
   * request back — there is nothing to ask for — and a disabled query reports
   * `isPending` forever, which would leave a skeleton on screen with no way out.
   * So no metrics is its own empty state, not a loading one.
   */
  const noMetrics = panel.metrics.length === 0

  return (
    <PanelCard
      title={title}
      description={description}
      isLoading={panel.isPending && !noMetrics}
      isFetching={panel.isFetching && !panel.isPending}
      error={panel.error}
      isEmpty={noMetrics || (Boolean(data) && isEmptySeries(data!))}
      emptyTitle={noMetrics ? 'No metrics selected' : 'No data yet'}
      emptyDescription={
        noMetrics
          ? 'Pick at least one metric to plot.'
          : 'No activity was recorded in this period for the selected population.'
      }
      skeletonHeight={height}
      actions={
        <>
          {allowMetricChoice ? (
            <Combobox
              multiple
              options={TREND_METRIC_OPTIONS}
              value={panel.metrics}
              onChange={(value) => panel.setMetrics(value as SeriesMetric[])}
              placeholder="Metrics"
              className="w-52"
              maxVisibleLabels={1}
            />
          ) : null}
          {panel.canChooseGranularity ? (
            <Combobox
              options={GRANULARITY_OPTIONS}
              value={panel.requestedGranularity}
              onChange={(value) => panel.setGranularity(value as Granularity)}
              searchable={false}
              className="w-32"
            />
          ) : (
            <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {/* Said out loud: a salary sheet has no day, so a payroll metric on
                  a daily axis would put each month's whole cost on the 1st. */}
              {panel.forcedMonthly ? 'Monthly — payroll has no daily grain' : 'Monthly'}
            </span>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {plots.map((plot) => (
          <Plot
            key={plot.id}
            plot={plot}
            granularity={granularity}
            baseline={panel.baseline}
            colorIndexOf={panel.colorIndexOf}
            height={height}
          />
        ))}
        <p className="text-xs text-muted-foreground">
          {granularityAxisLabel(granularity)}
          {plots.length > 1
            ? ' · one chart per unit, so no two scales share an axis'
            : ''}
        </p>
      </div>
    </PanelCard>
  )
}

function Plot({
  plot,
  granularity,
  baseline,
  colorIndexOf,
  height,
}: {
  plot: SeriesPlot
  granularity: Granularity
  baseline: number
  /** The metric's palette slot — pinned to the metric, not to its plot. */
  colorIndexOf: (metric: SeriesMetric) => number
  height: number
}) {
  const rows = useMemo(() => toSeriesRows(plot.series), [plot.series])

  /**
   * The stock plot's Y domain floors just under the standing headcount rather
   * than at zero. `baseline` is the headcount before the window opened, which is
   * the same figure `/summary` calls `opening_headcount`.
   */
  const domain: [number | 'auto', number | 'auto'] = plot.isStock
    ? [Math.max(0, Math.floor(baseline * 0.95)), 'auto']
    : [0, 'auto']

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {UNIT_LABELS[plot.unit]}
        {plot.isStock ? ' · standing total' : ''}
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ left: -8, right: 8, top: 8, bottom: 4 }}>
          <defs>
            {plot.series.map((entry) => (
              <linearGradient
                key={entry.metric}
                id={`series-grad-${plot.id}-${entry.metric}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={chartColor(colorIndexOf(entry.metric))}
                  stopOpacity={0.28}
                />
                <stop
                  offset="95%"
                  stopColor={chartColor(colorIndexOf(entry.metric))}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="bucket"
            {...axisProps}
            // The bucket string is SPLIT, not parsed — see the note above.
            tickFormatter={(bucket: string) => formatBucketTick(bucket, granularity)}
            minTickGap={24}
          />
          <YAxis
            {...axisProps}
            domain={domain}
            width={64}
            tickFormatter={(value: number) => formatTickByUnit(value, plot.unit)}
          />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(bucket) => formatBucketFull(String(bucket), granularity)}
            formatter={(value, name) => [
              formatByUnit(typeof value === 'number' ? value : null, plot.unit),
              metricLabel(name),
            ]}
          />
          {/* A legend is always present for two or more series, so identity is
              never carried by colour alone. */}
          {plot.series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}

          {plot.series.map((entry) => {
            const color = chartColor(colorIndexOf(entry.metric))
            const label = SERIES_METRIC_LABELS[entry.metric]

            if (plot.mark === 'area') {
              return (
                <Area
                  key={entry.metric}
                  type="monotone"
                  dataKey={entry.metric}
                  name={label}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#series-grad-${plot.id}-${entry.metric})`}
                  dot={false}
                  isAnimationActive={false}
                />
              )
            }

            if (plot.mark === 'bar') {
              return (
                <Bar
                  key={entry.metric}
                  dataKey={entry.metric}
                  name={label}
                  fill={color}
                  // A 4px rounded data-end anchored to the baseline.
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              )
            }

            return (
              <Line
                key={entry.metric}
                type="monotone"
                dataKey={entry.metric}
                name={label}
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** A recharts series name back to its metric label. */
function metricLabel(name: unknown): string {
  const key = String(name) as SeriesMetric
  return SERIES_METRIC_LABELS[key] ?? String(name)
}

/** Re-exported so the page can name a unit without importing constants. */
export type { MetricUnit }
