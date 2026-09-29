import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchAdminUser, fetchAdminUsers, fetchAssignableRoles } from './admin-user-api'

/**
 * GET /user/admin-users — the account's web-panel users, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. `companyId` is
 * the screen's filter, not the session's tenant: omit it for every user of the
 * account, owners included.
 */
export function useAdminUsers(params: PageParams = ALL_ROWS, companyId?: number) {
  return useQuery({
    queryKey: queryKeys.adminUser.list(params, companyId),
    queryFn: () => fetchAdminUsers(params, companyId),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /user/admin-users/:id — one user, as the edit form loads it.
 *
 * Also read by the list's Scope cell for the named companies, which the list
 * rows don't carry — `enabled: false` there skips a row that needs none.
 */
export function useAdminUser(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.adminUser.detail(id),
    queryFn: () => fetchAdminUser(id),
    enabled: enabled && Number.isFinite(id),
  })
}

/**
 * GET /user/admin-users/assignable-roles — the form's role dropdown.
 *
 * Account-wide and unpaged, and it only moves when a role is created, renamed or
 * deleted — so it's held for the session, and the role mutations invalidate this
 * key alongside their own.
 */
export function useAssignableRoles() {
  return useQuery({
    queryKey: queryKeys.adminUser.assignableRoles(),
    queryFn: () => fetchAssignableRoles(),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
