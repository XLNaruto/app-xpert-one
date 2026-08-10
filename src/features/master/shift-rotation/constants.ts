import type { ShiftRotationFormValues } from './schemas'

/**
 * The `sort` values `/user/shift-rotations` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const SHIFT_ROTATION_SORT = {
  name: 'name',
  cycleLengthWeeks: 'cycle_length_weeks',
  createdAt: 'created_at',
} as const

/** Newest rotation first — the order the list opens in and reverts to. */
export const SHIFT_ROTATION_DEFAULT_SORT = {
  id: SHIFT_ROTATION_SORT.createdAt,
  desc: true,
}

/**
 * Blank form values for a new rotation — a two-week cycle, the shortest one that
 * actually rotates, with both weeks waiting for a shift.
 */
export const EMPTY_SHIFT_ROTATION_FORM: ShiftRotationFormValues = {
  name: '',
  cycleLengthWeeks: '2',
  weeks: [
    { weekNumber: 1, shiftId: '' },
    { weekNumber: 2, shiftId: '' },
  ],
  status: true,
}
