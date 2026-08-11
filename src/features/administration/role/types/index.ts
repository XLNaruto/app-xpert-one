import type { AuditFields } from '@/types/audit'
import type { Permission, PermissionModule } from '@/features/permissions'

/**
 * How far a role reaches.
 *
 * `GLOBAL` is every company of the account, present and future — `companyIds` is
 * then EMPTY, and that emptiness reads as "all of them", never "none".
 * `COMPANY` is exactly the companies named.
 */
export type RoleAccessLevel = 'GLOBAL' | 'COMPANY'

/** One Talk grant — a company, optionally narrowed to a department. */
export interface RoleTalkGrant {
  companyId: number
  /** Null means the whole company. */
  departmentId: number | null
}

/** A role row on the list screen. The codes themselves come from the detail. */
export interface RoleListRow extends AuditFields {
  id: number
  /** The company the role belongs to. Null only for the account owner's shape. */
  companyId: number | null
  name: string
  /** Seeded server-side — not editable, not deletable. */
  isSystem: boolean
  accessLevel: RoleAccessLevel
  talkEnabled: boolean
  /** How many codes the role grants — sent so the screen need not count. */
  permissionCount: number
}

/**
 * One role with the builder catalog it is ticked against, so the edit screen
 * loads in a single call.
 *
 * `permissionCodes` is exactly what is stored. Should the plan have been narrowed
 * since, a stored code may have no checkbox in `modules` — which is why the form
 * keeps the two apart rather than deriving one from the other.
 */
export interface Role {
  id: number
  companyId: number | null
  name: string
  isSystem: boolean
  permissionCodes: Permission[]
  accessLevel: RoleAccessLevel
  companyIds: number[]
  talkEnabled: boolean
  talkAccess: RoleTalkGrant[]
  /** The catalog tree, with `granted` already reflecting this role. */
  modules: PermissionModule[]
}

/** `GET /user/roles/assignable-permissions` — the builder's checkbox matrix. */
export interface AssignablePermissions {
  /** Every code the tenant may put on a role, flattened, in catalog order. */
  permissionCodes: Permission[]
  modules: PermissionModule[]
}
