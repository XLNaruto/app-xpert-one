import type { HolidayFormValues } from './schemas'

/**
 * The `sort` values `/user/holidays` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const HOLIDAY_SORT = {
  holidayName: 'name',
  fromDate: 'from_date',
  toDate: 'to_date',
  createdAt: 'created_at',
} as const

/**
 * Newest record first — the order the list opens in and reverts to. This is not
 * the endpoint's own default (latest `from_date` first), so it's always sent.
 */
export const HOLIDAY_DEFAULT_SORT = { id: HOLIDAY_SORT.createdAt, desc: true }

/** Field labels, shared by the form and the list header. */
export const HOLIDAY_LABELS = {
  holidayName: 'Holiday Name',
  fromDate: 'From Date',
  toDate: 'To Date',
} as const

/** Blank form values for a new holiday. */
export const EMPTY_HOLIDAY_FORM: HolidayFormValues = {
  holidayName: '',
  fromDate: '',
  toDate: '',
}
