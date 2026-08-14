import type { AuditFields } from '@/types/audit'
import type { Permission, PermissionModule } from '@/features/permissions'

/**
 * A role is the PERMISSION CODES and nothing else.
 *
 * Access level, company reach and the Talk grants used to live here too, which
 * forced a separate role per office. They belong to the user now — see
 * `features/administration/admin-user` — so one role serves everyone who does
 * the same job, whatever companies each of them reaches.
 */

/** A role row on the list screen. The codes themselves come from the detail. */
export interface RoleListRow extends AuditFields {
  id: number
  /** The company the role belongs to. Null only for the account owner's shape. */
  companyId: number | null
  name: string
  /** Seeded server-side — not editable, not deletable. */
  isSystem: boolean
  /** Exactly what is stored on the role, in catalog order. */
  permissionCodes: Permission[]
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
  /** The catalog tree, with `granted` already reflecting this role. */
  modules: PermissionModule[]
}

/** `GET /user/roles/assignable-permissions` — the builder's checkbox matrix. */
export interface AssignablePermissions {
  /** Every code the tenant may put on a role, flattened, in catalog order. */
  permissionCodes: Permission[]
  modules: PermissionModule[]
}
