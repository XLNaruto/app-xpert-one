import { AxiosError } from 'axios'
import { ApiError, CONFLICT_STATUS, toApiError } from '@/lib/api-error'
import { activeCompanyId } from '@/lib/active-company'
import type { PageParams } from '@/lib/pagination'

/**
 * Request plumbing every Office Task `api/` file shares.
 *
 * No endpoint here takes a `company_id` — each one is scoped to the company the
 * session is working in, and answers `400 "Please select a company first."`
 * without one. `requireCompany()` fails first with `NO_ACTIVE_COMPANY`, so a
 * screen renders the company picker instead of that bare 400.
 */

/** What `activeCompanyId` names in its error when no company is selected. */
const WHAT = 'office tasks'

/** The most any Office Task list serves in one request. */
export const OFFICE_TASK_MAX_LIMIT = 100

/** Throw `NO_ACTIVE_COMPANY` before a request that can only 400 without one. */
export function requireCompany(): void {
  activeCompanyId(WHAT)
}

/**
 * `limit` / `offset` / `search` / `sort` / `sort_by`, as every paged list
 * spells them. The table's "All" is a negative limit — the most one page
 * serves. An order is always sent (defaulting to the screen's), so paging
 * can't repeat or skip rows.
 */
export function pageQuery(
  params: PageParams,
  defaultSort?: { id: string; desc: boolean },
): Record<string, string | number> {
  const search = params.search?.trim()
  return {
    limit: params.limit > 0 ? Math.min(params.limit, OFFICE_TASK_MAX_LIMIT) : OFFICE_TASK_MAX_LIMIT,
    offset: params.offset,
    ...(search ? { search } : {}),
    ...(defaultSort
      ? {
          sort: params.sort ?? defaultSort.id,
          sort_by: params.sortBy ?? (defaultSort.desc ? 'desc' : 'asc'),
        }
      : {}),
  }
}

/** The code on every "work has started" refusal — the control will never work again. */
export const TASK_STARTED_CODE = 'TASK_STARTED'

/**
 * Normalise a failed Office Task call.
 *
 * `VALIDATION` arrives on TWO statuses and they mean different things: a 422 is
 * a business rule whose `message` is the sentence to show ("Upload the proof
 * photo first."); a 400 is a request of the wrong SHAPE — a bug or a stale form
 * — whose `details` are raw schema issues. Those issues are never something to
 * put in front of a user, so a 400 shows the envelope's own generic `message`
 * ("Some of the details you entered are invalid…") rather than unpacking them.
 */
export function toOfficeTaskError(error: unknown, fallback: string): ApiError {
  if (error instanceof AxiosError && error.response?.status === 400) {
    const data = error.response.data as { code?: string; message?: string } | undefined
    if (data?.code === 'VALIDATION') return new ApiError(data.message || fallback, 400, data.code)
  }
  return toApiError(error, fallback)
}

/** A refusal that says the row's flags are stale — re-read before trying again. */
export function isStaleRowError(error: unknown): boolean {
  return error instanceof ApiError && error.status === CONFLICT_STATUS
}
