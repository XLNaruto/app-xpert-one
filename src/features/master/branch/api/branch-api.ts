import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { BRANCH_DEFAULT_SORT } from '../constants'
import { branchesResponseSchema, branchResponseSchema } from '../schemas'
import { branchToPayload, toBranch } from '../lib/branch-mappers'
import type { BranchFormValues, BranchPayload, BranchUpdatePayload } from '../schemas'
import type { Branch } from '../types'

/**
 * Branches — `/user/branches`. The endpoint is offset-paginated (`?limit=&offset=`,
 * limit capped at 100) and answers `{ items, total }`, which is exactly the
 * shape the list screen pages in. `search` is matched server-side against the
 * branch name, the city, the email and either mobile number, and `sort` accepts
 * `branch_name`, `city` or `created_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body, both
 * taken from the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * The tenant a read is scoped to.
 *
 * Normally the company the session has active. An employee transfer to another
 * company is the exception: it has to list the *destination* company's branches, so
 * the caller passes that id explicitly.
 */
function tenantId(companyId: number | undefined): number {
  return companyId ?? activeCompanyId('branches')
}

/**
 * The tenant scope plus `search` / `sort` / `sort_by` as the endpoint spells
 * them. Order is always sent — left off, the server's own default decides it,
 * and a list whose order isn't pinned can repeat or skip rows as the user pages.
 */
function queryParams(params: PageParams, companyId?: number) {
  return {
    company_id: tenantId(companyId),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? BRANCH_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (BRANCH_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/branches — one page of the company's branches, in the requested
 * order (newest first unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "every branch": the API caps a request at
 * 100, so that case walks the pages until `total` is covered.
 */
export async function fetchBranches(
  params: PageParams = ALL_ROWS,
  companyId?: number,
): Promise<Paginated<Branch>> {
  try {
    const query = queryParams(params, companyId)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.BRANCHES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = branchesResponseSchema.parse(raw)
      return { items: items.map(toBranch), total }
    }

    const collected: Branch[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.BRANCHES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = branchesResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toBranch))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load branches.")
  }
}

/** GET /user/branches/:id — one branch, for the detail and edit screens. */
export async function fetchBranch(id: number): Promise<Branch> {
  try {
    const raw = await http.get<unknown>(endpoints.BRANCHES.GET(id))
    return toBranch(branchResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Branch not found')
  }
}

/** POST /user/branches — add a branch to the active company. */
export async function createBranch(values: BranchFormValues): Promise<Branch> {
  try {
    const raw = await http.post<unknown, BranchPayload>(endpoints.BRANCHES.POST, {
      company_id: activeCompanyId('branches'),
      ...branchToPayload(values),
    })
    return toBranch(branchResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the branch.")
  }
}

/**
 * PATCH /user/branches/:id — the endpoint accepts a partial body, but the form
 * always submits every field, so we send the full record.
 */
export async function updateBranch(
  id: number,
  values: BranchFormValues,
): Promise<Branch> {
  try {
    const raw = await http.patch<unknown, BranchUpdatePayload>(
      endpoints.BRANCHES.PATCH(id),
      branchToPayload(values),
    )
    return toBranch(branchResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the branch.")
  }
}

/** DELETE /user/branches/:id */
export async function deleteBranch(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.BRANCHES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the branch.")
  }
}
