import type {
  HolidayFormValues,
  HolidayReminderResponse,
  HolidayResponse,
  HolidayUpdatePayload,
  HolidayYearFormValues,
  HolidayYearRowValues,
} from '../schemas'
import type { Holiday, HolidayReminder } from '../types'
import { accountingYearOfDate } from './accounting-year'

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
    // Older responses may not carry it yet — it's always derivable from the start.
    accountingYear:
      response.accounting_year ?? accountingYearOfDate(response.from_date) ?? '',
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

/** A year-form row with nothing in it — skipped on save rather than reported. */
function isBlankYearRow(row: HolidayYearRowValues): boolean {
  return !row.name.trim() && !row.fromDate && !row.toDate
}

/** Validated year form → the `holidays` array, blank rows dropped. */
export function holidayYearToPayload(
  values: HolidayYearFormValues,
): HolidayUpdatePayload[] {
  return values.rows
    .filter((row) => !isBlankYearRow(row))
    .map((row) => ({
      name: row.name.trim(),
      from_date: row.fromDate,
      to_date: row.toDate,
    }))
}

/** API reminder → the banner's model. */
export function toHolidayReminder(response: HolidayReminderResponse): HolidayReminder {
  const companies = (response.items ?? []).map((item) => ({
    companyId: item.company_id,
    companyName: item.company_name ?? item.company_code ?? `Company ${item.company_id}`,
    companyCode: item.company_code ?? '',
  }))
  return {
    // Nothing to name means nothing to show, whatever the flag says.
    show: response.show && companies.length > 0 && Boolean(response.accounting_year),
    accountingYear: response.accounting_year ?? '',
    startsOn: response.starts_on ?? '',
    endsOn: response.ends_on ?? '',
    status: response.status === 'overdue' ? 'overdue' : 'upcoming',
    daysUntilStart: response.days_until_start ?? 0,
    companies,
  }
}
