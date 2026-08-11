import type { AttendanceDayStatus, AttendanceStatusFilter } from './types'

/**
 * Cards per page. Higher than the app's default of five because the screen is a
 * grid of three across — five would leave a stranded row — and a company's
 * department list is short enough to scan a dozen at a time.
 *
 * Both endpoints cap `limit` at 100, so 100 is the last size offered and there
 * is no "All": the API has no way to answer one.
 */
export const ATTENDANCE_GROUP_PAGE_SIZE = 12
export const ATTENDANCE_GROUP_PAGE_SIZE_OPTIONS = [12, 24, 48, 96]

/** Employees per page behind one card. */
export const ATTENDANCE_EMPLOYEE_PAGE_SIZE = 20
export const ATTENDANCE_EMPLOYEE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

/** The hard ceiling both endpoints put on `limit`. */
export const ATTENDANCE_MAX_LIMIT = 100

/** The API's maximum length for the group search / employee term. */
export const ATTENDANCE_SEARCH_MAX_LENGTH = 100

/**
 * The pills above the employee list. The values are the API's own `?status=` —
 * the split is applied server-side, so a pill is a different read rather than a
 * filter over one page.
 */
export const ATTENDANCE_STATUS_TABS: {
  value: AttendanceStatusFilter
  label: string
}[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'all', label: 'All' },
]

/**
 * A resolved day in words. The API's `status` is the only thing that explains a
 * blank day — a weekly off, a holiday and an unexplained absence all have no
 * punch times — so every screen that shows a day shows this alongside it.
 */
export const DAY_STATUS_LABEL: Record<AttendanceDayStatus, string> = {
  present: 'Present',
  half_day: 'Half Day',
  absent: 'Absent',
  leave: 'On Leave',
  holiday: 'Holiday',
  weekly_off: 'Off Day',
  future: '',
}

/**
 * The colour a day is painted in the month grid, and in the legend under it.
 *
 * Three parts, because the same status has to read at three weights:
 *
 * - `chip` — the status bar inside a cell: a solid fill spanning the cell's
 *   width, so a week reads as a row of bars whose colours line up and a break in
 *   the pattern is visible without reading a word of it.
 * - `dot` — the solid swatch the legend under the board is built from.
 * - `text` — the punch times and worked hours under the chip, tinted to the same
 *   status so a cell reads as one block of colour rather than a badge with grey
 *   type hanging off it. Held back to 85% so the chip still leads.
 * - `date` — the date chip in the corner, tinted to the same status: a light
 *   fill of it with the dark step of it for ink. Written as `[&>abbr]:` rules
 *   because react-calendar renders the date itself, so the only way to reach it
 *   is from the class on the cell. Marked `!` for the same reason the washes are.
 * - `tile` — the cell wash. Barely there on purpose; it groups a week at a
 *   glance without competing with the chip sitting on it.
 *
 * The bars are drawn from Tailwind's own 500 steps rather than the app's status
 * tokens. `--success`, `--warning` and `--destructive` are the deep, low-key
 * shades a form's inline error wants; a month of them reads as a wall of oxblood
 * and rust. On a board whose entire job is to be scanned at a glance, the status
 * needs to carry across the width of the screen — so the fills are the bright
 * step, and the type under them the 600 one, which stays readable on the card.
 *
 * Held as class strings rather than tokens because Tailwind only ships the
 * classes it can see written out — a computed `bg-${tone}` would compile to
 * nothing.
 *
 * Every `tile` fill is marked `!`. react-calendar's stylesheet is imported
 * unlayered and sets `background: none` on `.react-calendar__tile`; an unlayered
 * declaration outranks any layered utility whatever its specificity, so without
 * the flag the washes simply never paint.
 */
export const DAY_STATUS_TONE: Record<
  AttendanceDayStatus,
  { chip: string; dot: string; text: string; date: string; tile: string }
> = {
  present: {
    chip: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    date: '[&>abbr]:bg-emerald-100! [&>abbr]:text-emerald-700!',
    tile: 'bg-emerald-500/6!',
  },
  half_day: {
    chip: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
    text: 'text-amber-600',
    date: '[&>abbr]:bg-amber-100! [&>abbr]:text-amber-700!',
    tile: 'bg-amber-500/6!',
  },
  absent: {
    chip: 'bg-rose-500 text-white',
    dot: 'bg-rose-500',
    text: 'text-rose-600',
    date: '[&>abbr]:bg-rose-100! [&>abbr]:text-rose-700!',
    tile: 'bg-rose-500/6!',
  },
  leave: {
    chip: 'bg-sky-500 text-white',
    dot: 'bg-sky-500',
    text: 'text-sky-600',
    date: '[&>abbr]:bg-sky-100! [&>abbr]:text-sky-700!',
    tile: 'bg-sky-500/6!',
  },
  holiday: {
    chip: 'bg-violet-500 text-white',
    dot: 'bg-violet-500',
    text: 'text-violet-600',
    date: '[&>abbr]:bg-violet-100! [&>abbr]:text-violet-700!',
    tile: 'bg-violet-500/6!',
  },
  /* The off-day slab. Light enough now to read as a quiet surface rather than a
     blocked-out cell, with the label in the page's own ink — white type needs a
     dark fill behind it, and this one lands around `#d3d8dd`. */
  weekly_off: {
    chip: 'bg-slate-400 text-white',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    date: '[&>abbr]:bg-white! [&>abbr]:text-slate-700!',
    tile: 'bg-muted-foreground/25! text-foreground!',
  },
  future: { chip: '', dot: '', text: '', date: '', tile: '' },
}

/** The statuses the legend under the grid explains, in reading order. */
export const DAY_STATUS_LEGEND: AttendanceDayStatus[] = [
  'present',
  'half_day',
  'absent',
  'leave',
  'holiday',
  'weekly_off',
]
