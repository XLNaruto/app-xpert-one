import type { AuditFields } from '@/types/audit'
import type { AdminUserStatus } from '../schemas'

/**
 * One web-panel login of the account.
 *
 * The same shape serves the list and the edit form — the detail read answers a
 * narrower record (no audit block), which the mapper defaults rather than
 * modelling as a second type.
 *
 * **Nothing here says what the user may do.** Permissions, company reach and
 * Talk grants all live on the role; `roleId` is the only handle on them, and
 * `GET /user/roles/{roleId}` is where they're read and edited.
 */
export interface AdminUser extends AuditFields {
  id: number
  firstName: string
  lastName: string
  /** The stored full name — first and last joined server-side. */
  name: string
  /** The user's LOGIN. Unique across the whole platform, not just this account. */
  email: string
  mobileNumber: string | null
  roleId: number | null
  /** Null for an account owner, who holds no role. */
  roleName: string | null
  /** Taken from the role. Null for an owner, who belongs to no one company. */
  companyId: number | null
  /**
   * True when the user holds no role — an account OWNER. Their access comes
   * from the subscription rather than a role, and they're provisioned by the
   * platform, which is why this screen can neither create nor delete one.
   */
  isOwner: boolean
  status: AdminUserStatus
  /**
   * PATCH only — true when the edit ended a live session (a role change or a
   * password reset does; a rename doesn't). Undefined on every other read.
   */
  sessionRevoked?: boolean
}

/**
 * A role the form may assign — every role of the account across ALL of its
 * companies, not just the active one. `accessLevel` and `talkEnabled` come
 * along so the form can show what the pick implies before it's saved.
 */
export interface AssignableRole {
  id: number
  name: string
  /** Becomes the user's company. Roles without one are never offered. */
  companyId: number
  accessLevel: 'GLOBAL' | 'COMPANY'
  talkEnabled: boolean
}
