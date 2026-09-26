import type { HolidayFormValues, HolidayYearRowValues } from './schemas'

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
  accountingYear: 'Accounting Year',
} as const

/** The list's year filter value meaning "every year" — no `accounting_year` sent. */
export const ALL_ACCOUNTING_YEARS = ''

/** Rows the year form opens with. */
export const HOLIDAY_YEAR_INITIAL_ROWS = 3

/** The API's cap on one year save. */
export const HOLIDAY_YEAR_MAX_ROWS = 100

/** Blank form values for a new holiday. */
export const EMPTY_HOLIDAY_FORM: HolidayFormValues = {
  holidayName: '',
  fromDate: '',
  toDate: '',
}

/** A blank row on the year form. */
export const EMPTY_HOLIDAY_YEAR_ROW: HolidayYearRowValues = {
  name: '',
  fromDate: '',
  toDate: '',
}
