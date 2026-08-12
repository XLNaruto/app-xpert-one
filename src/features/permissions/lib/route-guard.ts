import type { QueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryKeys } from '@/lib/query-keys'
import { ApiError, FORBIDDEN_STATUS, isForbiddenError } from '@/lib/api-error'
import { fetchMyRole } from '../api/permissions-api'
import { holdsPermission } from './permission-match'
import type { PermissionSpec } from '../types'

/**
 * Route-level permission gate — the counterpart to `useCan()` for direct URL
 * entry.
 *
 * Hiding a sidebar row stops discovery, not access: typing `/master/pf-rate`
 * still resolves the route. Call this from a module's `route.tsx` `beforeLoad`
 * and an unauthorised visit is blocked before the page renders — it throws an
 * {@link ApiError} with status 403, which the router's `defaultErrorComponent`
 * (`features/error` → `RouteError`) turns into the Forbidden screen.
 *
 * Reads the same cached query `useMyRole()` populates — fetching it once if the
 * guard runs before the layout mounted — so navigation costs no extra request.
 *
 * Falls open when the role can't be read for an incidental reason (network, 5xx)
 * or carries no codes at all, matching `useCan()`: the API checks every
 * permission itself, so a failed request must not lock the user out of their own
 * app. A 403 on the role call itself is the server's explicit answer about this
 * user, so it gates like any other missing permission.
 */
export async function requirePermission(
  queryClient: QueryClient,
  permission: PermissionSpec,
): Promise<void> {
  if (env.VITE_USE_MOCK_API) return

  let denied = false
  const role = await queryClient
    .ensureQueryData({
      queryKey: queryKeys.permissions.myRole(),
      queryFn: () => fetchMyRole(),
      staleTime: Infinity,
      gcTime: Infinity,
    })
    .catch((error: unknown) => {
      denied = isForbiddenError(error)
      return undefined
    })

  if (denied) {
    throw new ApiError('You do not have permission to access this page.', FORBIDDEN_STATUS)
  }
  if (!role) return

  const granted = new Set(role.permissionCodes)
  if (granted.size === 0) return
  if (holdsPermission(granted, permission)) return

  throw new ApiError('You do not have permission to access this page.', FORBIDDEN_STATUS)
}
