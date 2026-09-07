import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  CHART_COLORS,
  HEAT_STEPS,
  HEAT_ZERO,
  axisProps,
  chartColor,
  heatColor,
  tooltipStyle,
} from './tokens'

interface SeriesChartProps {
  /**
   * Row objects; keys are read via `xKey` and each series `key`.
   * Typed loosely because callers pass domain interfaces (which lack an
   * implicit index signature) into this generic recharts wrapper.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  xKey: string
  series: { key: string; label?: string }[]
  height?: number
}

export function TrendAreaChart({ data, xKey, series, height = 280 }: SeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipStyle} />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label ?? s.key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#grad-${s.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ComparisonBarChart({ data, xKey, series, height = 280 }: SeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label ?? s.key}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendLineChart({ data, xKey, series, height = 280 }: SeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label ?? s.key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function DonutChart({
  data,
  height = 280,
}: {
  data: { name: string; value: number }[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Radar (spider web) ────────────────────────────────────────────────────

/** One polygon: its identity, its colour slot, and its score per axis. */
export interface RadarSeries {
  key: string
  label: string
  /** Palette slot — pinned to the entity, so hiding a ring never recolours one. */
  colorIndex: number
  /**
   * Score per axis. A NULL is an UNMEASURED axis, not a zero: recharts breaks
   * the polygon at a null vertex, which is the honest drawing. Plotting it at
   * the centre would be a false accusation rendered in SVG.
   */
  scores: Record<string, number | null>
}

interface RadarWebChartProps {
  /** Axis keys in the order they must be drawn — fixed, so webs compare. */
  axes: { key: string; label: string }[]
  series: RadarSeries[]
  height?: number
  /** Tooltip formatter for one score — receives the raw fraction or null. */
  formatValue: (value: number | null) => string
}

/**
 * A radar on a FIXED 0-to-1 radial scale.
 *
 * Never auto-scaled to the data: the whole point is that two webs from two
 * requests are comparable, and an axis that rescales itself destroys that. The
 * axis order comes from the caller and is never re-sorted, for the same reason.
 */
export function RadarWebChart({
  axes,
  series,
  height = 320,
  formatValue,
}: RadarWebChartProps) {
  // One row per axis, one column per polygon — recharts' radar data shape.
  const data = axes.map((axis) => {
    const row: Record<string, string | number | null> = { axis: axis.label }
    for (const entry of series) row[entry.key] = entry.scores[axis.key] ?? null
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
        />
        {/* Fixed domain — not `['auto', 'auto']`. */}
        <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) =>
            formatValue(typeof value === 'number' ? value : null)
          }
        />
        {series.map((entry) => (
          <Radar
            key={entry.key}
            name={entry.label}
            dataKey={entry.key}
            stroke={chartColor(entry.colorIndex)}
            fill={chartColor(entry.colorIndex)}
            fillOpacity={0.12}
            strokeWidth={2}
            // A null vertex breaks the polygon rather than being bridged.
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ─── Heatmap ───────────────────────────────────────────────────────────────

export interface HeatmapCellView {
  key: string
  value: number
  intensity: number | null
  title: string
}

interface HeatmapGridProps {
  /** Y-axis labels, one per row. */
  rowLabels: string[]
  /** X-axis labels, one per column — `null` renders an unlabelled tick. */
  columnLabels: (string | null)[]
  /** `cells[row][column]` — always complete, zeroes included. */
  cells: HeatmapCellView[][]
  /** How a cell's value reads in its tooltip. */
  formatValue: (value: number) => string
  /** Minimum cell edge in px. The grid scrolls horizontally rather than squash. */
  cellSize?: number
  className?: string
}

/**
 * A dense value grid.
 *
 * Every cell is rendered, including the zeroes: a heatmap handed a sparse list
 * either leaves holes where a real zero belongs or shifts every following cell
 * one place along the axis. Cells carry a `title` so a value is reachable
 * without a hover layer, and the grid scrolls inside its own container so a wide
 * axis never makes the page scroll sideways.
 */
export function HeatmapGrid({
  rowLabels,
  columnLabels,
  cells,
  formatValue,
  cellSize = 18,
  className,
}: HeatmapGridProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="inline-block min-w-full">
        <table className="border-separate border-spacing-[2px]">
          <thead>
            <tr>
              <th className="w-8" />
              {columnLabels.map((label, index) => (
                <th
                  key={index}
                  style={{ minWidth: cellSize }}
                  className="pb-1 text-[10px] font-medium text-muted-foreground"
                >
                  {label ?? ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((rowLabel, rowIndex) => (
              <tr key={rowLabel}>
                <th className="pr-2 text-right text-[10px] font-medium text-muted-foreground">
                  {rowLabel}
                </th>
                {(cells[rowIndex] ?? []).map((cell) => (
                  <td key={cell.key} className="p-0">
                    <div
                      title={`${cell.title} · ${formatValue(cell.value)}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: heatColor(cell.value, cell.intensity),
                      }}
                      className="rounded-[3px]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** The ramp's own key — a heatmap without one is colour-only encoding. */
export function HeatmapLegend({
  max,
  formatValue,
}: {
  max: number
  formatValue: (value: number) => string
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>0</span>
      <span
        style={{ background: HEAT_ZERO }}
        className="size-3 rounded-[3px] border border-border"
      />
      {HEAT_STEPS.map((color, index) => (
        <span key={index} style={{ background: color }} className="size-3 rounded-[3px]" />
      ))}
      <span>{formatValue(max)}</span>
    </div>
  )
}
