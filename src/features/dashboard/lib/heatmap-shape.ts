import { WEEKDAY_LABELS } from '../constants'
import { formatCalendarDate } from './dashboard-format'
import type { DashboardHeatmap, HeatmapCell } from '../types'

/**
 * Laying the `/heatmap` cells out on a grid.
 *
 * The grid is ALWAYS COMPLETE — 168 cells for `weekday_hour`, every day in the
 * window for `calendar` — and the zeroes are load-bearing: a renderer handed a
 * sparse list either leaves holes where a real zero belongs or shifts every
 * following cell one place along the axis. So the cells are indexed into a map
 * and read back by coordinate rather than iterated in arrival order.
 *
 * The two shapes are transposed relative to each other, which is easy to get
 * wrong:
 *
 * * `weekday_hour` — `row` is the weekday (`0` = SUNDAY, Postgres `dow`) and
 *   `column` is the local hour. Drawn weekday down the Y axis, hour across X.
 * * `calendar` — `row` is the MONDAY of the ISO week and `column` is the weekday.
 *   For the classic contribution-graph layout that means plotting `row` across X
 *   (a column per week) and `column` down Y (a row per weekday).
 */

/** A cell placed on the grid, with everything its tooltip needs. */
export interface PlacedCell {
  key: string
  value: number
  /** `0..1` against the ramp's maximum — null when the max is 0. */
  intensity: number | null
  /** What the tooltip says this cell is. */
  title: string
}

/** A laid-out grid: axis labels plus a row of cells per Y-axis label. */
export interface HeatmapGrid {
  /** Labels down the Y axis. */
  rowLabels: string[]
  /** Labels across the X axis. */
  columnLabels: string[]
  /** `cells[rowIndex][columnIndex]`, always fully populated. */
  cells: PlacedCell[][]
}

/** `"14"` → `"2 pm"`, `"0"` → `"12 am"` — an hour label a reader can scan. */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  return hour < 12 ? `${hour}a` : `${hour - 12}p`
}

/**
 * A cell's position on the ramp.
 *
 * Scaled with the response's own `max`, which is what `max` is for — and when
 * two heatmaps share a screen and should be compared, the LARGER of the two
 * maxima is passed in for both. An all-zero grid returns null intensity for
 * every cell, so the ramp isn't asked to divide by zero.
 */
function intensityOf(value: number, max: number): number | null {
  if (max <= 0) return null
  return Math.min(1, value / max)
}

/** Index the cells by `row|column` so any coordinate is a lookup, not a scan. */
function indexCells(cells: HeatmapCell[]): Map<string, HeatmapCell> {
  const index = new Map<string, HeatmapCell>()
  for (const cell of cells) index.set(`${cell.row}|${cell.column}`, cell)
  return index
}

/**
 * The 7×24 grid: weekday down, hour across.
 *
 * Rendered from the axis definitions rather than from the payload's order, so a
 * cell the response somehow omitted reads as a real zero in its right place
 * instead of pushing its neighbours along.
 *
 * Hours are already in the requested timezone. Reading them as UTC makes every
 * Indian office look like it opens at 04:00.
 */
function toWeekdayHourGrid(heatmap: DashboardHeatmap, max: number): HeatmapGrid {
  const index = indexCells(heatmap.cells)
  const hours = Array.from({ length: 24 }, (_, hour) => hour)

  return {
    rowLabels: [...WEEKDAY_LABELS],
    columnLabels: hours.map(formatHourLabel),
    cells: WEEKDAY_LABELS.map((weekday, dow) =>
      hours.map((hour) => {
        const value = index.get(`${dow}|${hour}`)?.value ?? 0
        return {
          key: `${dow}-${hour}`,
          value,
          intensity: intensityOf(value, max),
          title: `${weekday} ${formatHourLabel(hour)}`,
        }
      }),
    ),
  }
}

/**
 * The contribution-graph calendar: one column per ISO week, one row per weekday.
 *
 * `row` is the week's Monday and `column` is the weekday, so the transpose here
 * is deliberate — weeks become the X axis and weekdays the Y axis.
 */
function toCalendarGrid(heatmap: DashboardHeatmap, max: number): HeatmapGrid {
  const index = indexCells(heatmap.cells)

  // Week columns in calendar order. Reading them off the payload keeps the axis
  // exactly as long as the window the server actually drew — which for a range
  // over a year is anchored to its RECENT end, not to what was requested.
  const weeks = [...new Set(heatmap.cells.map((cell) => cell.row))].sort()

  return {
    rowLabels: [...WEEKDAY_LABELS],
    columnLabels: weeks,
    cells: WEEKDAY_LABELS.map((weekday, dow) =>
      weeks.map((week) => {
        const cell = index.get(`${week}|${dow}`)
        const value = cell?.value ?? 0
        return {
          key: `${week}-${dow}`,
          value,
          intensity: intensityOf(value, max),
          title: cell?.date ? formatCalendarDate(cell.date) : `${weekday}, week of ${week}`,
        }
      }),
    ),
  }
}

/**
 * Lay a heatmap response out.
 *
 * `scaleMax` defaults to the response's own `max`; pass the larger of two
 * maxima to make two heatmaps on one screen directly comparable.
 */
export function toHeatmapGrid(
  heatmap: DashboardHeatmap,
  scaleMax = heatmap.max,
): HeatmapGrid {
  return heatmap.shape === 'calendar'
    ? toCalendarGrid(heatmap, scaleMax)
    : toWeekdayHourGrid(heatmap, scaleMax)
}

/**
 * Which X-axis ticks a calendar shows. One label per week would be unreadable,
 * so the first week of each month is labelled and the rest are blank.
 */
export function calendarMonthTicks(weeks: string[]): (string | null)[] {
  let lastMonth = ''
  return weeks.map((week) => {
    const month = week.slice(0, 7)
    if (month === lastMonth) return null
    lastMonth = month
    return week
  })
}
