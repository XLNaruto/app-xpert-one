import { Combobox } from '@/components/ui/combobox'
import { HeatmapGrid, HeatmapLegend } from '@/components/charts'
import { HEATMAP_METRIC_LABELS, HEATMAP_SHAPE_OPTIONS } from '../constants'
import { formatByUnit, formatWindow } from '../lib/dashboard-format'
import { calendarMonthTicks, formatHourLabel } from '../lib/heatmap-shape'
import { PanelCard } from './panel-card'
import type { useHeatmapPanel } from '../hooks/use-heatmap-panel'
import type { HeatmapMetric, HeatmapShape } from '../types'

/**
 * The punch-pattern heatmap.
 *
 * Four things it gets right:
 *
 * 1. **The axis is labelled from `from` / `to` on the RESPONSE.** A calendar is
 *    one cell per day, so a range longer than a year is anchored to its recent
 *    end — an `all_time` calendar labelled with the requested range would claim
 *    to start at the epoch.
 * 2. **The grid is complete, zeroes included.** They are laid out by coordinate
 *    rather than in arrival order, so a real zero never becomes a hole and never
 *    shifts the cells after it.
 * 3. **Zero has its own near-neutral colour**, distinct from the palest step of
 *    the ramp: "nothing happened" must not look like "a little happened".
 * 4. **Hours are already local.** They come back in the requested timezone —
 *    read as UTC, every Indian office looks like it opens at 04:00.
 *
 * `leave_days` is disabled on the weekday/hour grid, because a leave application
 * has dates and no clock and the endpoint answers 400 for the pair.
 */

interface HeatmapPanelProps {
  panel: ReturnType<typeof useHeatmapPanel>
}

export function HeatmapPanel({ panel }: HeatmapPanelProps) {
  const { data, grid, shape, metric } = panel

  // A calendar's X axis is one column per ISO week; labelling every week is
  // unreadable, so only the first week of each month carries a tick.
  const columnLabels =
    grid && shape === 'calendar'
      ? calendarMonthTicks(grid.columnLabels).map((week) =>
          week ? monthLabel(week) : null,
        )
      : (grid?.columnLabels.map((_hour, index) =>
          // Every third hour, so the 24 ticks don't collide.
          index % 3 === 0 ? formatHourLabel(index) : null,
        ) ?? [])

  return (
    <PanelCard
      title={shape === 'calendar' ? 'Activity calendar' : 'Punch pattern'}
      description={
        shape === 'calendar'
          ? 'One cell per day, weeks across and weekdays down.'
          : 'Weekday down, local hour across — the shape that shows a shift pattern or an office that really starts at ten.'
      }
      isLoading={panel.isPending}
      isFetching={panel.isFetching && !panel.isPending}
      error={panel.error}
      isEmpty={Boolean(data) && data!.max === 0}
      emptyDescription="No activity was recorded across the whole grid for this period."
      skeletonHeight={220}
      actions={
        <>
          <Combobox
            options={HEATMAP_SHAPE_OPTIONS}
            value={shape}
            onChange={(value) => panel.setShape(value as HeatmapShape)}
            searchable={false}
            className="w-40"
          />
          <Combobox
            options={panel.metricOptions}
            value={metric}
            onChange={(value) => panel.setMetric(value as HeatmapMetric)}
            searchable={false}
            className="w-40"
          />
        </>
      }
    >
      {data && grid ? (
        <div className="space-y-3">
          <HeatmapGrid
            rowLabels={grid.rowLabels}
            columnLabels={columnLabels}
            cells={grid.cells}
            formatValue={(value) => formatByUnit(value, data.unit)}
            cellSize={shape === 'calendar' ? 14 : 18}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {HEATMAP_METRIC_LABELS[data.metric]} ·{' '}
              {/* The window the server ACTUALLY drew. */}
              {formatWindow(data.from, data.to)}
            </p>
            <HeatmapLegend
              max={data.max}
              formatValue={(value) => formatByUnit(value, data.unit)}
            />
          </div>
        </div>
      ) : null}
    </PanelCard>
  )
}

/** `2026-08-03` → `Aug` — a month tick on the calendar's week axis. */
function monthLabel(week: string): string {
  const month = Number(week.slice(5, 7))
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return names[month - 1] ?? ''
}
