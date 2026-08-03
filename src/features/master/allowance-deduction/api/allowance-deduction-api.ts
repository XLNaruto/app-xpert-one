import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { ALLOWANCE_DEDUCTION_DEFAULT_SORT } from '../constants'
import { payComponentResponseSchema, payComponentsResponseSchema } from '../schemas'
import {
  allowanceDeductionToPayload,
  toAllowanceDeduction,
} from '../lib/allowance-deduction-mappers'
import type {
  AllowanceDeductionFormValues,
  PayComponentPayload,
  PayComponentUpdatePayload,
} from '../schemas'
import type { AllowanceDeduction } from '../types'

/**
 * Allowances and deductions — `/user/pay-components`. Both live in one resource,
 * told apart by the record's `type`, so this screen lists the whole payroll
 * catalog rather than filtering it.
 *
 * The endpoint is offset-paginated (`?limit=&offset=`, limit capped at 100) and
 * answers `{ items, total }`, which is exactly the shape the list screen pages
 * in. `search` is matched server-side against the short code and the name, and
 * `sort` accepts `short_code`, `name` or `created_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body, both
 * taken from the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/** What `activeCompanyId` calls this master in its "select a company" message. */
const WHAT = 'allowances and deductions'

/**
 * GET /user/pay-components — one page of the company's payroll catalog, in the
 * requested order (short code A→Z unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 *
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 */
export async function fetchAllowanceDeductions(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<AllowanceDeduction>> {
  try {
    const query = {
      company_id: activeCompanyId(WHAT),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      sort: params.sort ?? ALLOWANCE_DEDUCTION_DEFAULT_SORT.id,
      sort_by:
        params.sortBy ?? (ALLOWANCE_DEDUCTION_DEFAULT_SORT.desc ? 'desc' : 'asc'),
    }

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.PAY_COMPONENTS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = payComponentsResponseSchema.parse(raw)
      return { items: items.map(toAllowanceDeduction), total }
    }

    const collected: AllowanceDeduction[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.PAY_COMPONENTS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = payComponentsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toAllowanceDeduction))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load allowances and deductions.")
  }
}

/** GET /user/pay-components/:id — one component, for the edit form. */
export async function fetchAllowanceDeduction(id: number): Promise<AllowanceDeduction> {
  try {
    const raw = await http.get<unknown>(endpoints.PAY_COMPONENTS.GET(id))
    return toAllowanceDeduction(payComponentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Allowance / deduction not found')
  }
}

/** POST /user/pay-components — add a component to the company's catalog. */
export async function createAllowanceDeduction(
  values: AllowanceDeductionFormValues,
): Promise<AllowanceDeduction> {
  try {
    const raw = await http.post<unknown, PayComponentPayload>(
      endpoints.PAY_COMPONENTS.POST,
      {
        company_id: activeCompanyId(WHAT),
        ...allowanceDeductionToPayload(values),
      },
    )
    return toAllowanceDeduction(payComponentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the record.")
  }
}

/**
 * PATCH /user/pay-components/:id — the endpoint accepts a partial body, but the
 * form always submits every field, so we send the whole record.
 */
export async function updateAllowanceDeduction(
  id: number,
  values: AllowanceDeductionFormValues,
): Promise<AllowanceDeduction> {
  try {
    const raw = await http.patch<unknown, PayComponentUpdatePayload>(
      endpoints.PAY_COMPONENTS.PATCH(id),
      allowanceDeductionToPayload(values),
    )
    return toAllowanceDeduction(payComponentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the record.")
  }
}

/** DELETE /user/pay-components/:id — remove a component from the catalog. */
export async function deleteAllowanceDeduction(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.PAY_COMPONENTS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the record.")
  }
}
