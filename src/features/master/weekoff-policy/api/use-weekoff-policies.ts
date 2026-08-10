import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchWeekoffPolicies, fetchWeekoffPolicy } from './weekoff-policy-api'

/**
 * GET /user/weekoff-policies — a company's week-off policies, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with no
 * params it returns the whole master, which is what the shift form's dropdown and
 * the set-default dialog read.
 *
 * `companyId` is the company on screen. The master screen leaves it off and works
 * on the session's active company; the shift tab passes the company it's editing.
 */
export function useWeekoffPolicies(params: PageParams = ALL_ROWS, companyId?: number) {
  return useQuery({
    queryKey: queryKeys.weekoffPolicy.list(params, companyId),
    queryFn: () => fetchWeekoffPolicies(params, companyId),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** GET /user/weekoff-policies/:id — one policy with its whole rule set. */
export function useWeekoffPolicy(id: number) {
  return useQuery({
    queryKey: queryKeys.weekoffPolicy.detail(id),
    queryFn: () => fetchWeekoffPolicy(id),
    enabled: Number.isFinite(id),
  })
}
