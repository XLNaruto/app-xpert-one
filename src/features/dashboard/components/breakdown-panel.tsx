import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Combobox } from '@/components/ui/combobox'
import { Hint } from '@/components/common/hint'
import { ScrollableChart } from '@/components/charts/scrollable-chart'
import {
  NEUTRAL_ALT_COLOR,
  NEUTRAL_SERIES_COLOR,
  axisProps,
  chartColor,
  tooltipStyle,
} from '@/components/charts/tokens'
import { cn } from '@/lib/utils'
import {
  BREAKDOWN_MEASURE_LABELS,
  BREAKDOWN_MEASURE_OPTIONS,
  BREAKDOWN_SHAPE_OPTIONS,
  BREAKDOWN_DIMENSION_LABELS,
  CURRENT_POSTING_DIMENSIONS,
  type BreakdownChartShape,
} from '../constants'
import {
  formatByUnit,
  formatRatio,
  formatTickByUnit,
} from '../lib/dashboard-format'
import {
  isEmptyBreakdown,
  isOther,
  isReservedKey,
  isUnassigned,
} from '../lib/breakdown-shape'
import { DeltaBadge } from './delta-badge'
import { PanelCard } from './panel-card'
import type { useBreakdownPanel } from '../hooks/use-breakdown-panel'
import type {
  BreakdownDimension,
  BreakdownItem,
  BreakdownMeasure,
  MetricUnit,
} from '../types'

/**
 * One `/breakdown` response, drawn as a bar, a donut or grouped "vs previous"
 * columns — no extra request for any of them, because every item carries both
 * windows.
 *
 * The two reserved keys are handled the same way in all three shapes:
 *
 * * **`__other__` is never dropped.** It exists precisely so the slices still
 *   sum to `total`; a donut whose wedges add up to less than the number in its
 *   middle is a bug report. It wears neutral grey and is excluded from the "top"
 *   callout, because "Other (7)" is not a department.
 * * **`__unassigned__` is neutral and sorts last**, whatever its size. A null
 *   branch / department / designation is legitimate — those levels are optional
 *   in this product — so it is labelled and kept rather than hidden.
 *
 * Every dimension keeps the response's own biggest-first order — the six that
 * remain are all org facets, so there is no band ordering left to impose.
 */

interface BreakdownPanelProps {
  title: string
  panel: ReturnType<typeof useBreakdownPanel>
  /** Show the measure picker (a fixed-measure panel hides it). */
  allowMeasureChoice?: boolean
  /** Show the chart-shape toggle. */
  allowShapeChoice?: boolean
  /**
   * False under `all_time`, where every `previous_value` is 0 and every
   * `change_pct` null. The delta column and the "vs previous" shape are both
   * withdrawn rather than rendered as a column of "New" — there is no
   * equally-long period before all of history to compare against.
   */
  showComparisons?: boolean
  height?: number
}

export function BreakdownPanel({
  title,
  panel,
  allowMeasureChoice = true,
  allowShapeChoice = true,
  showComparisons = true,
  height = 300,
}: BreakdownPanelProps) {
  const { data, items, shape, measure, dimension, top } = panel

  /*
   * A "vs previous" chart with no previous period draws every second bar at
   * zero, which reads as "the previous period was empty" rather than as "there
   * is no previous period". So the shape falls back to a plain bar and the
   * option is withdrawn from the toggle.
   */
  const effectiveShape: BreakdownChartShape =
    !showComparisons && shape === 'comparative' ? 'bar' : shape
  const shapeOptions = showComparisons
    ? BREAKDOWN_SHAPE_OPTIONS
    : BREAKDOWN_SHAPE_OPTIONS.filter((option) => option.value !== 'comparative')

  /**
   * Attribution is "WHERE THE PERSON IS TODAY" — every dimension attributes a
   * fact to the employee's CURRENT posting, not to the posting they held when
   * the fact happened. So a transfer moves that person's whole history into
   * their new department, which is what keeps the department bars summing to the
   * headcount tile. Worth one line of copy on any org dimension.
   */
  const byCurrentPosting = CURRENT_POSTING_DIMENSIONS.includes(dimension)

  const description = [
    `${BREAKDOWN_MEASURE_LABELS[measure]} by ${BREAKDOWN_DIMENSION_LABELS[
      dimension
    ].toLowerCase()}`,
    byCurrentPosting ? `by current ${dimension}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <PanelCard
      title={title}
      description={description}
      isLoading={panel.isPending}
      isFetching={panel.isFetching && !panel.isPending}
      error={panel.error}
      isEmpty={Boolean(data) && isEmptyBreakdown(data!)}
      emptyDescription="Nothing was recorded for this measure in the selected period."
      skeletonHeight={height}
      actions={
        <>
          {allowMeasureChoice ? (
            <Combobox
              options={BREAKDOWN_MEASURE_OPTIONS}
              value={measure}
              onChange={(value) => panel.setMeasure(value as BreakdownMeasure)}
              searchable={false}
              className="w-40"
            />
          ) : null}
          {/* Re-filtered whenever the measure changes: an unresolvable pair is a
              400, and preventing it beats surfacing it. */}
          <Combobox
            options={panel.dimensionOptions}
            value={dimension}
            onChange={(value) => panel.setDimension(value as BreakdownDimension)}
            className="w-40"
          />
          {allowShapeChoice ? (
            <Combobox
              options={shapeOptions}
              value={effectiveShape}
              onChange={(value) => panel.setShape(value as BreakdownChartShape)}
              searchable={false}
              className="w-32"
            />
          ) : null}
        </>
      }
    >
      {data ? (
        <div className="space-y-4">
          {effectiveShape === 'donut' ? (
            <DonutShape items={items} total={data.total} unit={data.unit} height={height} />
          ) : (
            <BarShape
              items={items}
              unit={data.unit}
              comparative={effectiveShape === 'comparative'}
              height={height}
            />
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Total{' '}
              <span className="font-medium text-foreground">
                {formatByUnit(data.total, data.unit)}
              </span>
            </span>
            {top ? (
              <span>
                Largest{' '}
                <span className="font-medium text-foreground">{top.label}</span>{' '}
                ({formatRatio(top.share)})
              </span>
            ) : null}
          </div>

          {/* The table twin — every value is reachable without a hover, which is
              what keeps a colour-encoded chart accessible. Its swatches match
              whichever shape is drawn, so the key never disagrees with the chart. */}
          <BreakdownTable
            items={items}
            unit={data.unit}
            shape={effectiveShape}
            showComparisons={showComparisons}
          />
        </div>
      ) : null}
    </PanelCard>
  )
}

/**
 * A wedge's colour, for the shape that needs one per slice.
 *
 * The two reserved keys take the two neutrals — a folded remainder and an
 * unassigned bucket are not entities, and a palette hue would make either read
 * as a team. They get DIFFERENT neutrals because a donut can hold both at once,
 * and two wedges in the same grey are two wedges nobody can tell apart.
 */
function wedgeColor(item: BreakdownItem, index: number): string {
  if (isOther(item.key)) return NEUTRAL_SERIES_COLOR
  if (isUnassigned(item.key)) return NEUTRAL_ALT_COLOR
  return chartColor(index)
}

/**
 * A bar's colour: ONE hue for every real entity.
 *
 * A bar chart already encodes the value as length and names the category on the
 * axis, so colouring each bar differently spends the only free channel on
 * information the chart has shown twice already. The reserved keys still go
 * neutral, because "Other (7)" being visibly not-a-department is worth the
 * exception.
 */
function barColor(item: BreakdownItem): string {
  if (isOther(item.key)) return NEUTRAL_SERIES_COLOR
  if (isUnassigned(item.key)) return NEUTRAL_ALT_COLOR
  return chartColor(0)
}

/**
 * A category label, wrapped onto up to two lines and centred under its column.
 *
 * The alternative — one angled line — is what clipped long department names
 * against the bottom of the card and ran them into the legend. Wrapping keeps
 * the label horizontal (the only orientation that is actually readable at 12px)
 * and `ScrollableChart` guarantees the column is wide enough to hold it.
 */
const CATEGORY_TICK_CHARS = 14
const CATEGORY_TICK_LINES = 2
const CATEGORY_LINE_HEIGHT = 13

function wrapLabel(label: string): string[] {
  const words = label.split(/\s+/).filter(Boolean)
  const lines: string[] = []

  for (const word of words) {
    const last = lines[lines.length - 1]
    if (last && `${last} ${word}`.length <= CATEGORY_TICK_CHARS) {
      lines[lines.length - 1] = `${last} ${word}`
    } else {
      lines.push(word)
    }
  }

  // Anything past the second line is folded back into it with an ellipsis — the
  // full name is still on the tooltip and in the table twin below.
  if (lines.length > CATEGORY_TICK_LINES) {
    const kept = lines.slice(0, CATEGORY_TICK_LINES - 1)
    kept.push(`${lines[CATEGORY_TICK_LINES - 1].slice(0, CATEGORY_TICK_CHARS - 1)}…`)
    return kept
  }

  return lines.length > 0 ? lines : [label]
}

function CategoryTick({
  x,
  y,
  payload,
}: {
  x?: string | number
  y?: string | number
  payload?: { value?: string | number }
}) {
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      {wrapLabel(String(payload?.value ?? '')).map((line, index) => (
        <text
          key={line + index}
          x={0}
          y={12 + index * CATEGORY_LINE_HEIGHT}
          textAnchor="middle"
          fill="var(--color-muted-foreground)"
          fontSize={12}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

function BarShape({
  items,
  unit,
  comparative,
  height,
}: {
  items: BreakdownItem[]
  unit: MetricUnit
  comparative: boolean
  height: number
}) {
  const rows = items.map((item) => ({
    label: item.label,
    key: item.key,
    value: item.value,
    previousValue: item.previousValue,
  }))

  /*
   * A "vs previous" pair is only drawn when there IS a previous figure
   * somewhere. Otherwise every second column is zero-height, which leaves the
   * one visible column sitting in the left half of its band — it reads as
   * misaligned with its own label, because half the group it is centred in is
   * invisible. With no previous data the grouped shape says nothing anyway.
   */
  const hasPrevious = rows.some((row) => (row.previousValue ?? 0) !== 0)
  const paired = comparative && hasPrevious

  // Two columns per category in the paired shape, so it needs the room.
  const minPerItem = paired ? 104 : 76
  const axisLines = Math.max(
    1,
    ...rows.map((row) => wrapLabel(row.label).length),
  )

  return (
    <ScrollableChart count={rows.length} minPerItem={minPerItem} height={height}>
      {/* Columns, not rows: the VALUE runs up the y-axis and the category name
          sits along the x-axis, wrapped rather than angled. */}
      <BarChart
        data={rows}
        margin={{ left: -4, right: 16, top: 4, bottom: 4 }}
        barGap={2}
      >
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis
          type="category"
          dataKey="label"
          {...axisProps}
          // Every category is labelled — the scroller, not the axis, is what
          // makes room for them.
          interval={0}
          tick={(props) => <CategoryTick {...props} />}
          height={14 + axisLines * CATEGORY_LINE_HEIGHT}
        />
        <YAxis
          type="number"
          {...axisProps}
          tickFormatter={(value: number) => formatTickByUnit(value, unit)}
        />
        <Tooltip
          {...tooltipStyle}
          // `name` is already the series' own label — reading the dataKey here
          // instead is what had both rows saying "This period".
          formatter={(value, name) => [
            formatByUnit(typeof value === 'number' ? value : null, unit),
            String(name),
          ]}
        />
        {/* Above the plot, not below it: the x-axis owns the space under the
            columns once the labels wrap. */}
        {paired ? (
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />
        ) : null}

        <Bar
          dataKey="value"
          name="This period"
          // The series colour, so the legend swatch matches the columns; the
          // per-bar cells below only differ for the two reserved keys.
          fill={chartColor(0)}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        >
          {/* One hue for every bar — the axis names the category and the height
              carries the value, so a hue per bar would encode neither. */}
          {rows.map((row, index) => (
            <Cell key={row.key} fill={barColor(items[index])} />
          ))}
        </Bar>

        {paired ? (
          <Bar
            dataKey="previousValue"
            name="Previous period"
            fill="var(--color-muted-foreground)"
            fillOpacity={0.35}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        ) : null}
      </BarChart>
    </ScrollableChart>
  )
}

function DonutShape({
  items,
  total,
  unit,
  height,
}: {
  items: BreakdownItem[]
  total: number
  unit: MetricUnit
  height: number
}) {
  return (
    <div className="relative">
      <RechartsResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={items}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="82%"
            // A 2px surface gap between wedges rather than a stroke around each.
            paddingAngle={1}
            stroke="var(--color-card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {items.map((item, index) => (
              <Cell key={item.key} fill={wedgeColor(item, index)} />
            ))}
          </Pie>
          <Tooltip
            {...tooltipStyle}
            formatter={(value, name) => [
              formatByUnit(typeof value === 'number' ? value : null, unit),
              String(name),
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </RechartsResponsiveContainer>

      {/* `total` in the centre — and the wedges add up to it, because
          `__other__` is kept. */}
      <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="font-heading text-lg font-semibold">
          {formatByUnit(total, unit)}
        </p>
      </div>
    </div>
  )
}

/** The chart's table twin. */
function BreakdownTable({
  items,
  unit,
  shape,
  showComparisons,
}: {
  items: BreakdownItem[]
  unit: MetricUnit
  shape: BreakdownChartShape
  showComparisons: boolean
}) {
  const colorOf = (item: BreakdownItem, index: number) =>
    shape === 'donut' ? wedgeColor(item, index) : barColor(item)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-1.5 pr-2 font-medium">Slice</th>
            <th className="py-1.5 pr-2 text-right font-medium">Value</th>
            <th className="py-1.5 pr-2 text-right font-medium">Share</th>
            {showComparisons ? (
              <th className="py-1.5 text-right font-medium">Change</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.key} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 pr-2">
                <span className="flex items-center gap-2">
                  <span
                    style={{ background: colorOf(item, index) }}
                    className="size-2 shrink-0 rounded-sm"
                  />
                  <Hint text={sliceHint(item)}>
                    <span
                      className={cn(
                        'truncate',
                        isReservedKey(item.key) && 'text-muted-foreground',
                      )}
                    >
                      {item.label}
                    </span>
                  </Hint>
                </span>
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {formatByUnit(item.value, unit)}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {formatRatio(item.share)}
              </td>
              {showComparisons ? (
                <td className="py-1.5 text-right">
                  <DeltaBadge value={item.changePct} className="justify-end" />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Why a reserved slice is in the list at all — shown on hover of its label. */
function sliceHint(item: BreakdownItem): string | undefined {
  if (isOther(item.key)) {
    return 'The remainder beyond the named slices — kept so the slices still sum to the total'
  }
  if (isUnassigned(item.key)) {
    return 'No branch, department or designation set — which is legitimate here'
  }
  return undefined
}
