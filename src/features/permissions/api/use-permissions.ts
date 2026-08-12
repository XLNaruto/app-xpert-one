import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryKeys } from '@/lib/query-keys'
import { isForbiddenError } from '@/lib/api-error'
import { mockDelay } from '@/lib/utils'
import { fetchMyRole } from './permissions-api'
import { holdsPermission } from '../lib/permission-match'
import type { MyRole, PermissionSpec } from '../types'

/** Demo role for `VITE_USE_MOCK_API=true` — an owner with nothing withheld. */
async function mockMyRole(): Promise<MyRole> {
  await mockDelay(undefined, 150)
  return {
    userId: 0,
    roleId: null,
    roleName: 'Owner',
    isOwner: true,
    // Empty is the "unrestricted" case below: the demo session gates nothing.
    permissionCodes: [],
    modules: [],
    accessLevel: 'GLOBAL',
    companies: [],
    talkEnabled: false,
    talkAccess: [],
    access: { web: true, app: false, talk: false, attendance: true },
  }
}

/**
 * The signed-in user's role + permission codes — `GET /user/my-role`.
 *
 * Server state (it depends on the user and the active company), so it lives in
 * TanStack Query, never Zustand. Cached for the session: it only changes when
 * the user or the company does, and the company switch already invalidates
 * every key outside `myCompany`.
 *
 * Mounted once globally from the dashboard layout so the set is warm before any
 * gated menu row or button renders.
 */
export function useMyRole() {
  return useQuery({
    queryKey: queryKeys.permissions.myRole(),
    queryFn: () => (env.VITE_USE_MOCK_API ? mockMyRole() : fetchMyRole()),
    staleTime: Infinity,
    gcTime: Infinity,
    // A menu that silently empties itself is worse than one extra attempt; past
    // that the checker falls open rather than locking the user out (see below).
    // A 403 is the server's final answer, so retrying it only delays the gate.
    retry: (failureCount, error) => !isForbiddenError(error) && failureCount < 1,
  })
}

/** Kept as the mount-it-once alias the layout reads. */
export const usePermissions = useMyRole

/** Return type of {@link useCan} — `can(spec)` tests a single requirement. */
export interface PermissionChecker {
  /**
   * True when the user may use `spec` — an exact `resource:action` code, a bare
   * resource (any action on it), or an array of either (ANY-of). An empty spec
   * is ungated and always true.
   */
  can: (spec?: PermissionSpec | null) => boolean
  /** True when the user satisfies EVERY spec. */
  canEvery: (...specs: PermissionSpec[]) => boolean
  /** True when the user satisfies AT LEAST ONE spec. */
  canSome: (...specs: PermissionSpec[]) => boolean
  /** The loaded role, or undefined while it's still in flight. */
  role: MyRole | undefined
  /** Still loading — gated checks answer `false` meanwhile. */
  isLoading: boolean
  /**
   * True when nothing is being gated: the role call failed for an *incidental*
   * reason (network drop, 5xx), or it answered with no codes at all. The API
   * enforces every permission itself, so falling open there trades a menu row
   * the user may get a 403 on for never trapping a user in an empty app because
   * one request happened to fail.
   *
   * A 403 on `/user/my-role` is not incidental — it's the server's explicit
   * answer about this user — so it gates instead: every `can()` is false and the
   * sidebar empties rather than offering rows the API will refuse.
   */
  isUnrestricted: boolean
}

/**
 * The permission-check hook — the front-end gate for menus, routes and buttons.
 *
 * @example
 * const { can } = useCan()
 * {can(PERMISSIONS.employees) && <Link to="/hr/employee">Employees</Link>}
 * {can('employees:create') && <Button onClick={goToCreate}>Add Employee</Button>}
 */
export function useCan(): PermissionChecker {
  const { data, isLoading, isError, error } = useMyRole()

  return useMemo(() => {
    const granted = new Set(data?.permissionCodes ?? [])
    const denied = isError && isForbiddenError(error)
    const unrestricted =
      !denied && (isError || (data !== undefined && granted.size === 0))
    const can = (spec?: PermissionSpec | null) =>
      unrestricted ? true : holdsPermission(granted, spec)

    return {
      can,
      canEvery: (...specs) => specs.every((spec) => can(spec)),
      canSome: (...specs) => specs.some((spec) => can(spec)),
      role: data,
      isLoading,
      isUnrestricted: unrestricted,
    }
  }, [data, error, isError, isLoading])
}

/** The five uniform CRUD answers for one resource, as a screen needs them. */
export interface ResourceAccess {
  /** May open the list screen (`<resource>:list`, or `read` where the catalog only has that). */
  canList: boolean
  /** May open a record's detail screen (`<resource>:read`). */
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  /** `canCreate || canUpdate` — the create page serves both. */
  canManage: boolean
}

/**
 * Per-resource CRUD flags for a screen — one call instead of five `can(...)`s,
 * so a list page reads `const { canCreate, canUpdate, canDelete } =
 * useResourceAccess(PERMISSIONS.pfRates)` and hides the buttons it must.
 *
 * The route guard has already decided the user may be on the screen at all;
 * this decides which of its buttons exist.
 */
export function useResourceAccess(resource: string): ResourceAccess {
  const { can } = useCan()

  return useMemo(() => {
    const canCreate = can(`${resource}:create`)
    const canUpdate = can(`${resource}:update`)
    return {
      canList: can([`${resource}:list`, `${resource}:read`]),
      canView: can(`${resource}:read`),
      canCreate,
      canUpdate,
      canDelete: can(`${resource}:delete`),
      canManage: canCreate || canUpdate,
    }
  }, [can, resource])
}
