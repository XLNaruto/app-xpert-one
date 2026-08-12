import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { IP_ADDRESS_DEFAULT_SORT } from '../constants'
import {
  ipAccessModeResponseSchema,
  ipAddressResponseSchema,
  ipAddressesResponseSchema,
} from '../schemas'
import {
  ipAddressToPayload,
  toIpAccessModeState,
  toIpAddress,
} from '../lib/ip-address-mappers'
import type {
  IpAccessMode,
  IpAccessModePayload,
  IpAddressFormValues,
  IpAddressPayload,
  IpAddressType,
  IpAddressUpdatePayload,
} from '../schemas'
import type { IpAccessModeState, IpAddress } from '../types'

/**
 * IP access control — `/user/ip-addresses`. Which networks may reach the panel
 * for the active company: a mode switch plus the allow/block lists it reads.
 *
 * The list endpoint is offset-paginated (`?limit=&offset=`, limit capped at 200)
 * and answers `{ items, total }`, which is exactly the shape the list screen
 * pages in. `search` matches the address as text server-side, `type` narrows to
 * one list, and `sort` accepts `ip_addresses`, `type`, `created_at` or
 * `updated_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body, both
 * taken from the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 200

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/ip-addresses — one page of the company's entries, in the requested
 * order (newest first unless the screen says otherwise).
 *
 * `type` picks one list; omitted, both come back. `ALL_ROWS` (a negative limit)
 * means "every entry" — the API caps a request at 200, so that case walks the
 * pages until `total` is covered.
 *
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 */
export async function fetchIpAddresses(
  params: PageParams = ALL_ROWS,
  type?: IpAddressType,
): Promise<Paginated<IpAddress>> {
  try {
    const query = {
      company_id: activeCompanyId('IP access control'),
      ...(type ? { type } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      sort: params.sort ?? IP_ADDRESS_DEFAULT_SORT.id,
      sort_by: params.sortBy ?? (IP_ADDRESS_DEFAULT_SORT.desc ? 'desc' : 'asc'),
    }

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.IP_ADDRESSES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = ipAddressesResponseSchema.parse(raw)
      return { items: items.map(toIpAddress), total }
    }

    const collected: IpAddress[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.IP_ADDRESSES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = ipAddressesResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toIpAddress))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load IP addresses.")
  }
}

/**
 * POST /user/ip-addresses — add one entry to the active company's allow or block
 * list. The same address may sit on both lists (blocked wins at the door), but a
 * repeat within one list comes back 409 and the form shows the server's message.
 */
export async function createIpAddress(
  values: IpAddressFormValues,
): Promise<IpAddress> {
  try {
    const raw = await http.post<unknown, IpAddressPayload>(
      endpoints.IP_ADDRESSES.POST,
      {
        company_id: activeCompanyId('IP access control'),
        ...ipAddressToPayload(values),
      },
    )
    return toIpAddress(ipAddressResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't add the IP address.")
  }
}

/**
 * PATCH /user/ip-addresses/:id — edit an entry; the owning company is fixed.
 *
 * Refused with 409 when the result would duplicate another entry on the same
 * list, or when it would move the LAST allowed entry of a `RESTRICTED` company
 * off the allow list — that would leave a panel nobody can reach.
 */
export async function updateIpAddress(
  id: number,
  values: IpAddressFormValues,
): Promise<IpAddress> {
  try {
    const raw = await http.patch<unknown, IpAddressUpdatePayload>(
      endpoints.IP_ADDRESSES.PATCH(id),
      ipAddressToPayload(values),
    )
    return toIpAddress(ipAddressResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the IP address.")
  }
}

/**
 * DELETE /user/ip-addresses/:id — remove an entry, freeing the address to be
 * added again.
 *
 * Refused with 409 when it's the last allowed entry of a `RESTRICTED` company;
 * that message comes from the server and is what the delete dialog surfaces.
 */
export async function deleteIpAddress(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.IP_ADDRESSES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the IP address.")
  }
}

/** GET /user/ip-addresses/mode — the company's mode and its two list counts. */
export async function fetchIpAccessMode(): Promise<IpAccessModeState> {
  try {
    const raw = await http.get<unknown>(endpoints.IP_ADDRESSES.MODE, {
      params: { company_id: activeCompanyId('IP access control') },
    })
    return toIpAccessModeState(ipAccessModeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the IP access mode.")
  }
}

/**
 * PUT /user/ip-addresses/mode — switch the company between `PUBLIC` and
 * `RESTRICTED`.
 *
 * Refused with 409 when switching to `RESTRICTED` while the allow list is empty:
 * that would admit nobody at all, the caller included. Switching to `PUBLIC`
 * does NOT clear the block list — an address someone barred stays barred.
 */
export async function updateIpAccessMode(
  mode: IpAccessMode,
): Promise<IpAccessModeState> {
  try {
    const raw = await http.put<unknown, IpAccessModePayload>(
      endpoints.IP_ADDRESSES.MODE,
      {
        company_id: activeCompanyId('IP access control'),
        ip_access_mode: mode,
      },
    )
    return toIpAccessModeState(ipAccessModeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't change the IP access mode.")
  }
}
