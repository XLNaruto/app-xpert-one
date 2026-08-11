import type { MyRoleResponse, PermissionModuleResponse } from '../schemas'
import type { MyRole, PermissionModule } from '../types'

/**
 * One catalog node, snake_case → camelCase, recursing into `children`.
 *
 * The same node shape serves `GET /user/my-role` (the pruned menu) and
 * `GET /user/roles/assignable-permissions` / `GET /user/roles/:id` (the builder
 * catalog), so the role feature maps its tree through this too.
 */
export function toPermissionModule(raw: PermissionModuleResponse): PermissionModule {
  return {
    key: raw.key,
    label: raw.label,
    panel: raw.panel,
    panelLabel: raw.panel_label ?? '',
    icon: raw.icon ?? undefined,
    permissions: raw.permissions,
    granted: raw.granted,
    actions: raw.actions.map((action) => ({
      permission: action.permission,
      label: action.label,
      icon: action.icon ?? undefined,
      description: action.description ?? undefined,
      granted: action.granted,
      requires: action.requires,
    })),
    children: raw.children.map(toPermissionModule),
  }
}

/** `GET /user/my-role` → the UI-facing {@link MyRole}. */
export function toMyRole(raw: MyRoleResponse): MyRole {
  return {
    userId: raw.user_id,
    roleId: raw.role_id ?? null,
    roleName: raw.role_name ?? (raw.is_owner ? 'Owner' : ''),
    isOwner: raw.is_owner,
    permissionCodes: raw.permission_codes,
    modules: raw.modules.map(toPermissionModule),
    accessLevel: raw.access_level,
    companyIds: raw.company_ids,
    talkEnabled: raw.talk_enabled,
    talkAccess: raw.talk_access.map((grant) => ({
      companyId: grant.company_id,
      departmentId: grant.department_id ?? null,
    })),
    access: raw.access,
  }
}
