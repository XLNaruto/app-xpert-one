import type { ComboboxOption } from '@/components/ui/combobox'
import type { ShiftFormValues } from './schemas'
import type { LateCheckInPenaltyType } from './types'

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

/** How a late day is charged — the two ways the API accepts. */
export const LATE_CHECK_IN_PENALTY_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Percentage of the day', value: 'PERCENTAGE' },
  { label: 'Fixed amount', value: 'FIXED' },
]

/** Short display label for a configured penalty type. */
export const LATE_CHECK_IN_PENALTY_TYPE_LABELS: Record<LateCheckInPenaltyType, string> = {
  PERCENTAGE: '%',
  FIXED: '₹',
}

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
  // Off, matching the API's default and every existing shift — break overage is
  // reported but not charged until a company opts in.
  isLateBreakPenaltyApplicable: false,
  concessionMinutes: '',
  // Off, like the break penalty and every existing shift — lateness is reported
  // but not charged until a company opts in, and no rule is configured yet.
  isLateCheckInPenaltyApplicable: false,
  lateCheckInPenaltyType: '',
  lateCheckInPenaltyValue: '',
  minFullDayHours: '',
  minHalfDayHours: '',
  // No pattern of its own — the shift follows the department's or company's default.
  weekoffPolicyId: '',
  status: true,
}
