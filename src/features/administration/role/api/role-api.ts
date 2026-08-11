import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { ROLE_DEFAULT_SORT } from '../constants'
import {
  assignablePermissionsResponseSchema,
  roleResponseSchema,
  rolesResponseSchema,
} from '../schemas'
import {
  toAssignablePermissions,
  toRole,
  toRoleListRow,
  roleToPayload,
} from '../lib/role-mappers'
import type { RoleFormValues, RolePayload, RoleUpdatePayload } from '../schemas'
import type { AssignablePermissions, Role, RoleListRow } from '../types'

/**
 * Roles — `/user/roles`. Offset-paginated (`?limit=&offset=`, limit capped at
 * 100) answering `{ items, total }`, with `search` matched server-side against
 * the role name and `sort` accepting `name` or `created_at`.
 *
 * Roles are authored PER COMPANY: the list takes a required `company_id` and a
 * create carries it in the body, both from the session's active company. How far
 * the role then *reaches* is a separate question, answered by `access_level` and
 * `company_ids` on the record itself.
 */

/** What `activeCompanyId` names in its error when no company is selected. */
const WHAT = 'roles'

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
    sort: params.sort ?? ROLE_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (ROLE_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/roles — one page of a company's roles. Rows carry `permission_count`
 * and the audit block; the codes themselves come from the detail call.
 *
 * `ALL_ROWS` (a negative limit) means "every role": the API caps a request at
 * 100, so that case walks the pages until `total` is covered.
 */
export async function fetchRoles(
  params: PageParams = ALL_ROWS,
  companyId?: number,
): Promise<Paginated<RoleListRow>> {
  try {
    const query = queryParams(params, companyId)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.ROLES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = rolesResponseSchema.parse(raw)
      return { items: items.map(toRoleListRow), total }
    }

    const collected: RoleListRow[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.ROLES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = rolesResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toRoleListRow))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load roles.")
  }
}

/**
 * GET /user/roles/:id — one role WITH the builder catalog it is ticked against,
 * so the edit screen loads in a single call.
 */
export async function fetchRole(id: number): Promise<Role> {
  try {
    const raw = await http.get<unknown>(endpoints.ROLES.GET(id))
    return toRole(roleResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Role not found')
  }
}

/**
 * GET /user/roles/assignable-permissions — the builder's checkbox matrix.
 *
 * The web-panel catalog narrowed twice: to what the account's plan unlocked, and
 * minus role management itself, which is never delegatable. An action absent here
 * can never be saved, so the screen renders exactly what comes back. An empty
 * answer means the organization has no serving subscription — nothing is granted
 * by absence.
 */
export async function fetchAssignablePermissions(): Promise<AssignablePermissions> {
  try {
    const raw = await http.get<unknown>(endpoints.ROLES.ASSIGNABLE_PERMISSIONS)
    return toAssignablePermissions(assignablePermissionsResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the permission catalog.")
  }
}

/**
 * POST /user/roles — author a role for the session's company.
 *
 * The name must be unique within that company (409 otherwise), and every code is
 * validated against the assignable catalog: anything outside it, or any `roles:*`
 * code, is rejected with a 400 naming the offenders.
 */
export async function createRole(
  values: RoleFormValues,
  companyId?: number,
): Promise<Role> {
  try {
    const raw = await http.post<unknown, RolePayload>(endpoints.ROLES.POST, {
      company_id: tenantId(companyId),
      ...roleToPayload(values),
    })
    return toRole(roleResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the role.")
  }
}

/**
 * PATCH /user/roles/:id — rename a role and replace its permissions.
 *
 * The endpoint accepts a partial body, but the form always submits the whole
 * record: `permission_codes` REPLACES the stored set rather than merging, which
 * is exactly what the builder means — it holds the complete selection, not a diff.
 * The owning company is fixed and never sent.
 *
 * Users already holding the role pick the change up at their next login;
 * permissions are minted into the access token.
 */
export async function updateRole(id: number, values: RoleFormValues): Promise<Role> {
  try {
    const raw = await http.patch<unknown, RoleUpdatePayload>(
      endpoints.ROLES.PATCH(id),
      roleToPayload(values),
    )
    return toRole(roleResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the role.")
  }
}

/**
 * DELETE /user/roles/:id — soft-delete a role and free its name for the company
 * again. Refused with 409 while any live user still holds it; the server's reason
 * carries the count, which is what the screen shows.
 */
export async function deleteRole(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.ROLES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the role.")
  }
}
