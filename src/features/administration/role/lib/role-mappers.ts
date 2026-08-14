import { toPermissionModule } from '@/features/permissions'
import type {
  AssignablePermissionsResponse,
  RoleFormValues,
  RoleListRowResponse,
  RoleResponse,
  RoleUpdatePayload,
} from '../schemas'
import type { AssignablePermissions, Role, RoleListRow } from '../types'

/** One list row, snake_case → camelCase. Audit fields default the house way. */
export function toRoleListRow(response: RoleListRowResponse): RoleListRow {
  return {
    id: response.id,
    companyId: response.company_id ?? null,
    name: response.name,
    isSystem: response.is_system,
    permissionCodes: response.permission_codes,
    permissionCount: response.permission_count,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/** `GET /user/roles/:id` → the role plus the catalog it's ticked against. */
export function toRole(response: RoleResponse): Role {
  return {
    id: response.id,
    companyId: response.company_id ?? null,
    name: response.name,
    isSystem: response.is_system,
    permissionCodes: response.permission_codes,
    modules: response.modules.map(toPermissionModule),
  }
}

/** `GET /user/roles/assignable-permissions` → the builder catalog. */
export function toAssignablePermissions(
  response: AssignablePermissionsResponse,
): AssignablePermissions {
  return {
    permissionCodes: response.permission_codes,
    modules: response.modules.map(toPermissionModule),
  }
}

/**
 * Validated form values → the body shared by create and update.
 *
 * The name and the codes are the whole body. Nothing about reach travels: the
 * endpoint IGNORES `access_level` / `company_ids` / `talk_enabled` /
 * `talk_access` rather than rejecting them, so sending one would fail silently.
 */
export function roleToPayload(values: RoleFormValues): RoleUpdatePayload {
  return {
    name: values.name.trim(),
    permission_codes: values.permissionCodes,
  }
}

/**
 * Hydrate the edit form from a stored record.
 *
 * `permissionCodes` comes straight from what's stored rather than from the
 * ticked catalog: should the plan have been narrowed since, a stored code may
 * have no checkbox at all, and reading the tree instead would silently drop it
 * on the next save.
 */
export function roleToFormValues(role: Role): RoleFormValues {
  return {
    name: role.name,
    permissionCodes: role.permissionCodes,
  }
}
