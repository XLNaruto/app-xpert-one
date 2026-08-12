import { toCompanyRef, toPermissionModule, toTalkGrant } from '@/features/permissions'
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
    accessLevel: response.access_level,
    talkEnabled: response.talk_enabled,
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
    accessLevel: response.access_level,
    companies: response.company_ids.map(toCompanyRef),
    talkEnabled: response.talk_enabled,
    talkAccess: response.talk_access.map(toTalkGrant),
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
 * The two scope switches decide what travels: a `GLOBAL` role's companies and a
 * Talk-disabled role's grants are stored empty whatever the form last held, so
 * they're cleared here rather than sent to be ignored — what's posted is then
 * exactly what will come back.
 */
export function roleToPayload(values: RoleFormValues): RoleUpdatePayload {
  return {
    name: values.name.trim(),
    permission_codes: values.permissionCodes,
    access_level: values.accessLevel,
    company_ids: values.accessLevel === 'GLOBAL' ? [] : [...new Set(values.companyIds)],
    talk_enabled: values.talkEnabled,
    // One entry per company, its departments nested — an empty list is "the
    // whole company", which is what a grant with nothing narrowed means.
    talk_access: values.talkEnabled
      ? values.talkAccess.map((grant) => ({
          company_id: Number(grant.companyId),
          department_ids: [...new Set(grant.departmentIds.map(Number))],
        }))
      : [],
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
    accessLevel: role.accessLevel,
    companyIds: role.companies.map((company) => company.id),
    talkEnabled: role.talkEnabled,
    talkAccess: role.talkAccess.map((grant) => ({
      companyId: String(grant.companyId),
      departmentIds: grant.departments.map((department) => String(department.id)),
    })),
  }
}

/** How far a role reaches, as the list column says it. */
export function accessLevelLabel(role: Pick<RoleListRow, 'accessLevel'>): string {
  return role.accessLevel === 'GLOBAL' ? 'All companies' : 'Selected companies'
}
