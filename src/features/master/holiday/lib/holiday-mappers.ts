import type { HolidayFormValues } from '../schemas'
import type { Holiday } from '../types'

/** Hydrate the edit form from a stored holiday. */
export function holidayToFormValues(holiday: Holiday): HolidayFormValues {
  return {
    holidayName: holiday.holidayName,
    fromDate: holiday.fromDate,
    toDate: holiday.toDate,
  }
}
