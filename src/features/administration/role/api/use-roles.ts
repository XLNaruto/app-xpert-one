import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchAssignablePermissions, fetchRole, fetchRoles } from './role-api'

/**
 * GET /user/roles — a company's roles, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with no
 * params it returns every role, which is what a role picker would read.
 */
export function useRoles(params: PageParams = ALL_ROWS, companyId?: number) {
  return useQuery({
    queryKey: queryKeys.role.list(params, companyId),
    queryFn: () => fetchRoles(params, companyId),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** GET /user/roles/:id — one role with the catalog it is ticked against. */
export function useRole(id: number) {
  return useQuery({
    queryKey: queryKeys.role.detail(id),
    queryFn: () => fetchRole(id),
    enabled: Number.isFinite(id),
  })
}

/**
 * GET /user/roles/assignable-permissions — the builder catalog.
 *
 * One per account and only changing when the subscription does, so it's held for
 * the session rather than re-read every time the create screen opens.
 *
 * `enabled` lets the edit screen skip it: `GET /user/roles/:id` already answers
 * with the catalog ticked, so loading both would be two calls for one tree.
 */
export function useAssignablePermissions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.role.assignablePermissions(),
    queryFn: () => fetchAssignablePermissions(),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
