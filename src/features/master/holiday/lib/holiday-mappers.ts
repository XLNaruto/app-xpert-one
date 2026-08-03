import type {
  HolidayFormValues,
  HolidayResponse,
  HolidayUpdatePayload,
} from '../schemas'
import type { Holiday } from '../types'

/**
 * The API takes and documents both dates as `yyyy-MM-dd`, but a date column can
 * come back as a full timestamp — keep the date half, which is what the date
 * inputs bind to and what a `yyyy-MM-dd` string compare orders correctly.
 */
function toDateOnly(value: string): string {
  return value.slice(0, 10)
}

/**
 * API record → the UI holiday. The audit trail only comes back on the list
 * rows; on a single-record response it's absent and renders as a dash.
 */
export function toHoliday(response: HolidayResponse): Holiday {
  return {
    id: response.id,
    companyId: response.company_id,
    holidayName: response.name,
    fromDate: toDateOnly(response.from_date),
    toDate: toDateOnly(response.to_date),
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at,
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a record between
 * tenants, so the update body stops here.
 */
export function holidayToPayload(values: HolidayFormValues): HolidayUpdatePayload {
  return {
    name: values.holidayName.trim(),
    from_date: values.fromDate,
    to_date: values.toDate,
  }
}

/** Hydrate the edit form from a stored holiday. */
export function holidayToFormValues(holiday: Holiday): HolidayFormValues {
  return {
    holidayName: holiday.holidayName,
    fromDate: holiday.fromDate,
    toDate: holiday.toDate,
  }
}
