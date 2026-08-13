import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { ADMIN_USER_DEFAULT_SORT } from '../constants'
import {
  adminUserResponseSchema,
  adminUsersResponseSchema,
  assignableRolesResponseSchema,
} from '../schemas'
import {
  adminUserToPayload,
  adminUserToUpdatePayload,
  toAdminUser,
  toAssignableRole,
} from '../lib/admin-user-mappers'
import type {
  AdminUserFormValues,
  AdminUserPayload,
  AdminUserUpdatePayload,
} from '../schemas'
import type { AdminUser, AssignableRole } from '../types'

/**
 * Admin users — `/user/admin-users`. Offset-paginated (`?limit=&offset=`, limit
 * capped at 100) answering `{ items, total }`, with `search` matched
 * server-side against name, email and mobile number, and `sort` accepting
 * `name`, `email` or `created_at`.
 *
 * ACCOUNT-scoped, unlike every tenant master: `company_id` is a FILTER here, not
 * a requirement. Left off, the list is every user of the account — which also
 * includes the OWNERS, who belong to no company; narrowed to one company, they
 * drop out of it for exactly that reason.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * `search` / `sort` / `sort_by` as the endpoint spells them, plus the company
 * filter when one is applied. Order is always sent — left off, the server's own
 * default decides it, and a list whose order isn't pinned can repeat or skip
 * rows as the user pages.
 */
function queryParams(params: PageParams, companyId?: number) {
  return {
    ...(companyId ? { company_id: companyId } : {}),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? ADMIN_USER_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (ADMIN_USER_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/admin-users — one page of the account's web-panel users.
 *
 * `ALL_ROWS` (a negative limit) means "every user": the API caps a request at
 * 100, so that case walks the pages until `total` is covered.
 */
export async function fetchAdminUsers(
  params: PageParams = ALL_ROWS,
  companyId?: number,
): Promise<Paginated<AdminUser>> {
  try {
    const query = queryParams(params, companyId)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.ADMIN_USERS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = adminUsersResponseSchema.parse(raw)
      return { items: items.map(toAdminUser), total }
    }

    const collected: AdminUser[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.ADMIN_USERS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = adminUsersResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toAdminUser))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load users.")
  }
}

/**
 * GET /user/admin-users/:id — one user, as the edit form loads it.
 *
 * It carries `role_id` but nothing about permissions, company reach or Talk:
 * those live on the role and are read from `GET /user/roles/:id`.
 */
export async function fetchAdminUser(id: number): Promise<AdminUser> {
  try {
    const raw = await http.get<unknown>(endpoints.ADMIN_USERS.GET(id))
    return toAdminUser(adminUserResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'User not found')
  }
}

/**
 * GET /user/admin-users/assignable-roles — the form's role dropdown.
 *
 * Every role the account has authored across ALL of its companies, unpaginated.
 * Roles with no company are omitted, because creating a user with one is
 * rejected — that's the owner's shape, and this screen doesn't make owners.
 */
export async function fetchAssignableRoles(): Promise<AssignableRole[]> {
  try {
    const raw = await http.get<unknown>(endpoints.ADMIN_USERS.ASSIGNABLE_ROLES)
    return assignableRolesResponseSchema.parse(raw).items.map(toAssignableRole)
  } catch (error) {
    throw toApiError(error, "Couldn't load the roles a user can be given.")
  }
}

/**
 * POST /user/admin-users — create a web-panel login.
 *
 * The email and the mobile number are each checked against every admin, every
 * organization and every user on the platform (409). The server's message is
 * deliberately vague about where a clash is, so it's surfaced verbatim.
 */
export async function createAdminUser(values: AdminUserFormValues): Promise<AdminUser> {
  try {
    const raw = await http.post<unknown, AdminUserPayload>(
      endpoints.ADMIN_USERS.POST,
      adminUserToPayload(values),
    )
    return toAdminUser(adminUserResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the user.")
  }
}

/**
 * PATCH /user/admin-users/:id — a partial update.
 *
 * `record` is what's currently stored, and it's what decides whether `role_id`
 * travels at all (see `adminUserToUpdatePayload`). A role or password change
 * ends every session the user holds; the response says so via `sessionRevoked`.
 */
export async function updateAdminUser(
  id: number,
  values: AdminUserFormValues,
  record: AdminUser,
): Promise<AdminUser> {
  try {
    const raw = await http.patch<unknown, AdminUserUpdatePayload>(
      endpoints.ADMIN_USERS.PATCH(id),
      adminUserToUpdatePayload(values, record),
    )
    return toAdminUser(adminUserResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the user.")
  }
}

/**
 * DELETE /user/admin-users/:id — soft-delete a user and end their sessions.
 *
 * Their email is NOT released: the uniqueness constraint isn't soft-delete
 * aware, so the address stays taken. Refused with 400 for your own user and for
 * an account owner — the list hides the action in both cases.
 */
export async function deleteAdminUser(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.ADMIN_USERS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the user.")
  }
}
