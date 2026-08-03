import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { COMPANY_DEFAULT_SORT } from '../constants'
import { companiesResponseSchema, companyResponseSchema } from '../schemas'
import { companyToPayload, toCompany } from '../lib/company-mappers'
import type { CompanyFormValues, CompanyPayload } from '../schemas'
import type { Company } from '../types'

/**
 * The company master — `/user/companies`. Every company under the caller's
 * account, offset-paginated (`?limit=&offset=`, limit capped at 100) and
 * answering `{ items, total }`, which is exactly the shape the list screen pages
 * in. Search and sort are server-side, so both span every page.
 *
 * A record carries its state and district names alongside their ids, so no
 * screen joins the geography masters to read a company — the list rows, the
 * detail screen and the edit form's dropdown labels all come off the record.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * `search` / `sort` / `sort_by` as the endpoint spells them. Order is always
 * sent — left off, the server's own default decides it, and a list whose order
 * isn't pinned can repeat or skip rows as the user pages through it.
 */
function queryParams(params: PageParams) {
  return {
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? COMPANY_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (COMPANY_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/companies — one page of companies in the requested order (newest
 * first unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a
 * request at 100, so that case walks the pages until `total` is covered.
 */
export async function fetchCompanies(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<Company>> {
  try {
    const query = queryParams(params)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.COMPANIES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = companiesResponseSchema.parse(raw)
      return { items: items.map((item) => toCompany(item)), total }
    }

    const records: Company[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.COMPANIES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = companiesResponseSchema.parse(raw)
      total = parsed.total
      records.push(...parsed.items.map((item) => toCompany(item)))
      if (parsed.items.length === 0 || records.length >= total) break
    }

    return { items: records, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load companies.")
  }
}

/**
 * GET /user/companies/:id — one company, for the detail and edit screens.
 *
 * The record's state and district names come back on the response itself, so
 * this is one request: no lookup against the geography masters, on either
 * screen.
 */
export async function fetchCompany(id: number): Promise<Company> {
  try {
    const raw = await http.get<unknown>(endpoints.COMPANIES.GET(id))
    return toCompany(companyResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Company not found')
  }
}

/** POST /user/companies — add a company; the server assigns its code. */
export async function createCompany(values: CompanyFormValues): Promise<Company> {
  try {
    const raw = await http.post<unknown, CompanyPayload>(
      endpoints.COMPANIES.POST,
      companyToPayload(values),
    )
    return toCompany(companyResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the company.")
  }
}

/**
 * PATCH /user/companies/:id — the endpoint accepts a partial body, but the form
 * always submits every field, so we send the full record.
 */
export async function updateCompany(
  id: number,
  values: CompanyFormValues,
): Promise<Company> {
  try {
    const raw = await http.patch<unknown, CompanyPayload>(
      endpoints.COMPANIES.PATCH(id),
      companyToPayload(values),
    )
    return toCompany(companyResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the company.")
  }
}

/** DELETE /user/companies/:id */
export async function deleteCompany(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.COMPANIES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the company.")
  }
}
