import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { ensureStates } from '@/features/master/state'
import { ensureDistricts } from '@/features/master/district'
import { OFFICE_ADDRESS_DEFAULT_SORT } from '../constants'
import {
  officeAddressResponseSchema,
  officeAddressesResponseSchema,
} from '../schemas'
import { officeAddressToPayload, toOfficeAddress } from '../lib/office-address-mappers'
import type {
  OfficeAddressFormValues,
  OfficeAddressPayload,
  OfficeAddressResponse,
} from '../schemas'
import type { OfficeAddress, OfficeFor } from '../types'

/**
 * Office addresses — `/user/office-addresses`. One endpoint behind all five
 * screens (PF, ESIC, LWF, Factory, Employment Exchange); a record's `office_for`
 * is what decides which screen owns it, and the list read filters on it
 * server-side (`?office_for=`), so each screen pages over its own rows only.
 *
 * A record references its state and district by id only, so every read joins in
 * both masters to fill the names the list rows display.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * The state and district names for one record, for the edit form.
 *
 * Only the single-record read does this. The list deliberately doesn't: joining
 * the geography masters would cost extra requests per page, so its State and
 * District columns read `state_name`/`district_name` straight off the record —
 * see `toOfficeAddress`. Here it's one cached lookup on a screen showing one
 * office, and the form needs the names to label its dropdowns before their first
 * page loads.
 *
 * A failed lookup shouldn't take the form down with it, so each degrades to an
 * empty list and the name reads as a dash.
 */
async function recordNames(
  record: OfficeAddressResponse,
): Promise<{ stateName?: string; districtName?: string }> {
  const [states, districts] = await Promise.all([
    ensureStates().catch(() => []),
    record.state_id === null
      ? Promise.resolve([])
      : ensureDistricts(record.state_id).catch(() => []),
  ])

  return {
    stateName: states.find((s) => s.id === record.state_id)?.stateName,
    districtName: districts.find((d) => d.id === record.district_id)?.districtName,
  }
}

/**
 * `office_for` plus `search` / `sort` / `sort_by` as the endpoint spells them.
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 */
function queryParams(officeFor: OfficeFor, params: PageParams) {
  return {
    office_for: officeFor,
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? OFFICE_ADDRESS_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (OFFICE_ADDRESS_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/office-addresses — one page of `officeFor`'s addresses, filtered,
 * searched and ordered server-side.
 *
 * `ALL_ROWS` (a negative limit) means "every address of that body": the API caps
 * a request at 100, so that case walks the pages until `total` is covered.
 *
 * No geography lookup here — the State/District columns read the names off the
 * record itself, so a page of addresses is exactly the requests it needs.
 */
export async function fetchOfficeAddresses(
  officeFor: OfficeFor,
  params: PageParams = ALL_ROWS,
): Promise<Paginated<OfficeAddress>> {
  try {
    const query = queryParams(officeFor, params)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.OFFICE_ADDRESSES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = officeAddressesResponseSchema.parse(raw)
      return { items: items.map((item) => toOfficeAddress(item)), total }
    }

    const collected: OfficeAddress[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.OFFICE_ADDRESSES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = officeAddressesResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map((item) => toOfficeAddress(item)))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load office addresses.")
  }
}

/** GET /user/office-addresses/:id — one address, for the edit form. */
export async function fetchOfficeAddress(id: number): Promise<OfficeAddress> {
  try {
    const raw = await http.get<unknown>(endpoints.OFFICE_ADDRESSES.GET(id))
    const response = officeAddressResponseSchema.parse(raw)
    const { stateName, districtName } = await recordNames(response)
    return toOfficeAddress(response, stateName, districtName)
  } catch (error) {
    throw toApiError(error, 'Office address not found')
  }
}

/** POST /user/office-addresses — add an address under `officeFor`. */
export async function createOfficeAddress(
  officeFor: OfficeFor,
  values: OfficeAddressFormValues,
): Promise<OfficeAddress> {
  try {
    const raw = await http.post<unknown, OfficeAddressPayload>(
      endpoints.OFFICE_ADDRESSES.POST,
      officeAddressToPayload(values, officeFor),
    )
    return toOfficeAddress(officeAddressResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the office address.")
  }
}

/**
 * PATCH /user/office-addresses/:id — the endpoint accepts a partial body, but
 * the form always submits every field, so we send the full address. `office_for`
 * goes with it so an edit can't silently move the record to another screen.
 */
export async function updateOfficeAddress(
  id: number,
  officeFor: OfficeFor,
  values: OfficeAddressFormValues,
): Promise<OfficeAddress> {
  try {
    const raw = await http.patch<unknown, OfficeAddressPayload>(
      endpoints.OFFICE_ADDRESSES.PATCH(id),
      officeAddressToPayload(values, officeFor),
    )
    return toOfficeAddress(officeAddressResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the office address.")
  }
}

/** DELETE /user/office-addresses/:id */
export async function deleteOfficeAddress(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.OFFICE_ADDRESSES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the office address.")
  }
}
