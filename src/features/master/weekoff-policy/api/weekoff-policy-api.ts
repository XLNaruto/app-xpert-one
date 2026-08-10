import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { WEEKOFF_POLICY_DEFAULT_SORT } from '../constants'
import {
  weekoffPoliciesResponseSchema,
  weekoffPolicyResponseSchema,
} from '../schemas'
import {
  toWeekoffPolicy,
  weekoffPolicyToPayload,
} from '../lib/weekoff-policy-mappers'
import type {
  WeekoffDefaultScope,
  WeekoffPolicyFormValues,
  WeekoffPolicyPayload,
  WeekoffPolicyUpdatePayload,
} from '../schemas'
import type { WeekoffPolicy } from '../types'

/**
 * Week-off policies — `/user/weekoff-policies`. Offset-paginated
 * (`?limit=&offset=`, limit capped at 100) answering `{ items, total }`, with
 * `search` matched server-side against the policy name and `sort` accepting
 * `name` or `created_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body. The
 * master screen works on the session's active company, but the shift form reads
 * the policies of the company on screen — which is another tenant — so every
 * call accepts an explicit `companyId` and only falls back to the session's
 * without one.
 */

/** What `activeCompanyId` names in its error when no company is selected. */
const WHAT = 'week-off policies'

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/** The tenant a read is scoped to — the company on screen, or the session's. */
function tenantId(companyId: number | undefined): number {
  return companyId ?? activeCompanyId(WHAT)
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
    sort: params.sort ?? WEEKOFF_POLICY_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (WEEKOFF_POLICY_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/weekoff-policies — one page of a company's policies, each row
 * carrying its whole rule set (that's what the screen renders as the pattern
 * summary).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 */
export async function fetchWeekoffPolicies(
  params: PageParams = ALL_ROWS,
  companyId?: number,
): Promise<Paginated<WeekoffPolicy>> {
  try {
    const query = queryParams(params, companyId)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.WEEKOFF_POLICIES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = weekoffPoliciesResponseSchema.parse(raw)
      return { items: items.map(toWeekoffPolicy), total }
    }

    const collected: WeekoffPolicy[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.WEEKOFF_POLICIES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = weekoffPoliciesResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toWeekoffPolicy))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load week-off policies.")
  }
}

/** GET /user/weekoff-policies/:id — one policy with its whole rule set. */
export async function fetchWeekoffPolicy(id: number): Promise<WeekoffPolicy> {
  try {
    const raw = await http.get<unknown>(endpoints.WEEKOFF_POLICIES.GET(id))
    return toWeekoffPolicy(weekoffPolicyResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Week-off policy not found')
  }
}

/** POST /user/weekoff-policies — add a policy to the company. */
export async function createWeekoffPolicy(
  values: WeekoffPolicyFormValues,
  companyId?: number,
): Promise<WeekoffPolicy> {
  try {
    const raw = await http.post<unknown, WeekoffPolicyPayload>(
      endpoints.WEEKOFF_POLICIES.POST,
      {
        company_id: tenantId(companyId),
        ...weekoffPolicyToPayload(values),
      },
    )
    return toWeekoffPolicy(weekoffPolicyResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the week-off policy.")
  }
}

/**
 * PATCH /user/weekoff-policies/:id — the endpoint accepts a partial body, but the
 * form always submits the whole record, `days` included. Sending `days` replaces
 * every rule, which is exactly what the form means: the editor holds the complete
 * pattern, not a diff of it.
 */
export async function updateWeekoffPolicy(
  id: number,
  values: WeekoffPolicyFormValues,
): Promise<WeekoffPolicy> {
  try {
    const raw = await http.patch<unknown, WeekoffPolicyUpdatePayload>(
      endpoints.WEEKOFF_POLICIES.PATCH(id),
      weekoffPolicyToPayload(values),
    )
    return toWeekoffPolicy(weekoffPolicyResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the week-off policy.")
  }
}

/**
 * DELETE /user/weekoff-policies/:id — refused with 409 while a shift, company or
 * department still points at it. The server's reason is what the screen shows.
 */
export async function deleteWeekoffPolicy(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.WEEKOFF_POLICIES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the week-off policy.")
  }
}

/**
 * POST /user/weekoff-policies/:id/set-default — make this the default pattern for
 * one company or one department. Exactly one of the two ids travels, and a
 * department's default wins over its company's.
 *
 * Without a default at one of those levels, every shift that doesn't name its own
 * policy falls back to the platform's Sunday-only constant.
 */
export async function setDefaultWeekoffPolicy(
  policyId: number,
  scope: WeekoffDefaultScope,
): Promise<void> {
  try {
    await http.post<unknown, WeekoffDefaultScope>(
      endpoints.WEEKOFF_POLICIES.SET_DEFAULT(policyId),
      scope,
    )
  } catch (error) {
    throw toApiError(error, "Couldn't set the default week-off pattern.")
  }
}

/**
 * POST /user/weekoff-policies/clear-default — drop the default of one company or
 * one department. A department with none falls back to its company's; a company
 * with none leaves its shifts on the Sunday-only constant.
 */
export async function clearDefaultWeekoffPolicy(
  scope: WeekoffDefaultScope,
): Promise<void> {
  try {
    await http.post<unknown, WeekoffDefaultScope>(
      endpoints.WEEKOFF_POLICIES.CLEAR_DEFAULT,
      scope,
    )
  } catch (error) {
    throw toApiError(error, "Couldn't clear the default week-off pattern.")
  }
}
