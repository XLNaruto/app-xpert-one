import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { HOLIDAY_DEFAULT_SORT } from '../constants'
import { holidayResponseSchema, holidaysResponseSchema } from '../schemas'
import { holidayToPayload, toHoliday } from '../lib/holiday-mappers'
import type {
  HolidayFormValues,
  HolidayPayload,
  HolidayUpdatePayload,
} from '../schemas'
import type { Holiday } from '../types'

/**
 * Holidays — `/user/holidays`. The endpoint is offset-paginated
 * (`?limit=&offset=`, limit capped at 100) and answers `{ items, total }`,
 * which is exactly the shape the list screen pages in. `search` is matched
 * server-side against the holiday name, and `sort` accepts `name`, `from_date`,
 * `to_date` or `created_at`.
 *
 * Like leave types, the calendar is explicitly tenant-scoped: reads take a
 * required `company_id` and a create carries it in the body, both taken from
 * the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/holidays — one page of the company's holiday calendar, in the
 * requested order (newest record first unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 *
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 */
export async function fetchHolidays(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<Holiday>> {
  try {
    const query = {
      company_id: activeCompanyId('holidays'),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      sort: params.sort ?? HOLIDAY_DEFAULT_SORT.id,
      sort_by: params.sortBy ?? (HOLIDAY_DEFAULT_SORT.desc ? 'desc' : 'asc'),
    }

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.HOLIDAYS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = holidaysResponseSchema.parse(raw)
      return { items: items.map(toHoliday), total }
    }

    const collected: Holiday[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.HOLIDAYS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = holidaysResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toHoliday))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load holidays.")
  }
}

/** GET /user/holidays/:id — one holiday, for the edit form. */
export async function fetchHoliday(id: number): Promise<Holiday> {
  try {
    const raw = await http.get<unknown>(endpoints.HOLIDAYS.GET(id))
    return toHoliday(holidayResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Holiday not found')
  }
}

/** POST /user/holidays — add a holiday to the active company's calendar. */
export async function createHoliday(values: HolidayFormValues): Promise<Holiday> {
  try {
    const raw = await http.post<unknown, HolidayPayload>(endpoints.HOLIDAYS.POST, {
      company_id: activeCompanyId('holidays'),
      ...holidayToPayload(values),
    })
    return toHoliday(holidayResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the holiday.")
  }
}

/**
 * PATCH /user/holidays/:id — the endpoint accepts a partial body, but the form
 * always submits every field, so we send the whole record.
 */
export async function updateHoliday(
  id: number,
  values: HolidayFormValues,
): Promise<Holiday> {
  try {
    const raw = await http.patch<unknown, HolidayUpdatePayload>(
      endpoints.HOLIDAYS.PATCH(id),
      holidayToPayload(values),
    )
    return toHoliday(holidayResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the holiday.")
  }
}

/** DELETE /user/holidays/:id — remove a holiday from the calendar. */
export async function deleteHoliday(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.HOLIDAYS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the holiday.")
  }
}
