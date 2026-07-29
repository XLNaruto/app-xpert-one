import type { HolidayFormValues } from './schemas'

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
