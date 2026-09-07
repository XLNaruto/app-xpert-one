import { Info } from 'lucide-react'
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
 *
 * And the grid HONOURS ONLY THE COMPANY FILTER: branch, department, designation,
 * employment type and grade are ignored on that shape, because the hourly rollup
 * behind it is keyed by company alone — an hour dimension multiplies its rows by
 * 24, and "when does this office start" is a company-level question anyway. The
 * filter bar is shared by every panel on the screen, so those controls cannot be
 * greyed out from in here without breaking the other seven; the panel says it
 * instead, and only when a narrowing that is actually being ignored is applied.
 * Otherwise a user changes a filter and watches nothing happen.
 */

interface HeatmapPanelProps {
  panel: ReturnType<typeof useHeatmapPanel>
  /**
   * Population narrowings the weekday/hour grid ignores — everything below
   * company. Named so the notice can list exactly what is not being applied.
   */
  ignoredFilters?: string[]
}

export function HeatmapPanel({ panel, ignoredFilters = [] }: HeatmapPanelProps) {
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
          {shape === 'weekday_hour' && ignoredFilters.length > 0 ? (
            <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                This grid is keyed by company only, so the{' '}
                {ignoredFilters.join(', ')} filter
                {ignoredFilters.length === 1 ? ' is' : 's are'} not applied here.
                Switch to the calendar to narrow further.
              </span>
            </p>
          ) : null}
          <HeatmapGrid
            rowLabels={grid.rowLabels}
            columnLabels={columnLabels}
            cells={grid.cells}
            formatValue={(value) => formatByUnit(value, data.unit)}
            /*
              The weekday grid is only seven rows tall, which left it the
              shortest content on the dashboard — a small stamp in a card sized
              by the taller panel beside it. 26px cells give the seven weekdays
              real presence and still fit 24 hours across a half-width card
              (24 × 26 + spacing ≈ 670px), and the grid scrolls rather than
              squashes if a narrower one ever has to hold them.

              The calendar shape keeps its small cells: it is 53 weeks across,
              and anything bigger scrolls on every screen.
            */
            cellSize={shape === 'calendar' ? 14 : 26}
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
