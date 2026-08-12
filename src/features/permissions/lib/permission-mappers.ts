import type {
  CompanyRefResponse,
  MyRoleResponse,
  PermissionModuleResponse,
  TalkGrantResponse,
} from '../schemas'
import type { CompanyRef, MyRole, PermissionModule, TalkGrant } from '../types'

/**
 * A named company on a role's reach. Shared by `my-role` and the role detail —
 * both answer `{ id, company_name }`.
 */
export function toCompanyRef(raw: CompanyRefResponse): CompanyRef {
  return { id: raw.id, name: raw.company_name }
}

/**
 * One Talk grant — a company with its departments nested. An empty
 * `departments` is carried through as-is: it means the WHOLE company, and
 * collapsing it to anything else would lose that.
 */
export function toTalkGrant(raw: TalkGrantResponse): TalkGrant {
  return {
    companyId: raw.company_id,
    companyName: raw.company_name,
    departments: raw.departments.map((department) => ({
      id: department.department_id,
      name: department.department_name,
    })),
  }
}

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
    companies: raw.company_ids.map(toCompanyRef),
    talkEnabled: raw.talk_enabled,
    talkAccess: raw.talk_access.map(toTalkGrant),
    access: raw.access,
  }
}
