import type { ShiftFormValues } from './schemas'

/**
 * The `sort` values `/user/shifts` accepts. Sorting is server-side, so a column
 * is sortable only if it appears here — the list gives each of these columns the
 * API's field name as its column id, and marks the rest unsortable.
 */
export const SHIFT_SORT = {
  shiftName: 'name',
  startTime: 'start_time',
  endTime: 'end_time',
  createdAt: 'created_at',
} as const

/**
 * Earliest start first — the order the list opens in and reverts to. It matches
 * the endpoint's own default, but is still sent: an order that isn't pinned can
 * repeat or skip rows as the user pages.
 */
export const SHIFT_DEFAULT_SORT = { id: SHIFT_SORT.startTime, desc: false }

/** Rows per page on the shift tab — the tab sits under a form, so it stays short. */
export const SHIFT_PAGE_SIZE = 5

/**
 * Blank form values for a new shift. The four tolerance fields open blank and
 * fall back to the API's own defaults, so a company that doesn't care about them
 * never has to fill them in.
 */
export const EMPTY_SHIFT_FORM: ShiftFormValues = {
  shiftName: '',
  startTime: '',
  endTime: '',
  breakMinutes: '',
  concessionMinutes: '',
  earlyExitGraceMinutes: '',
  minFullDayHours: '',
  minHalfDayHours: '',
  status: true,
}
