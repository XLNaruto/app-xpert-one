import type { AuditFields } from '@/types/audit'
import type { AccessLevel, CompanyRef, TalkGrant } from '@/features/permissions'
import type { AdminUserStatus } from '../schemas'

/**
 * One web-panel login of the account.
 *
 * The same shape serves the list and the edit form — the detail read answers a
 * narrower record (no audit block), which the mapper defaults rather than
 * modelling as a second type.
 *
 * **What the user may DO comes from the role** — `roleId` is the only handle on
 * the permission codes, read and edited at `GET /user/roles/{roleId}`.
 * **How far they REACH is theirs**: `accessLevel` / `companies` are the
 * companies they can act in and `talkEnabled` / `talkAccess` where they may
 * chat, all edited on this screen. Two people on one role can differ in both.
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
   * How far this login reaches. An OWNER is always `GLOBAL` by construction.
   * `GLOBAL` leaves {@link companies} empty, and that emptiness reads as EVERY
   * company — present and future — never "none".
   */
  accessLevel: AccessLevel
  /**
   * The companies named on a `COMPANY`-level reach, resolved to names by the
   * API. **Only the detail read carries them** — a list row answers the two
   * scalars alone, so this is empty there whatever the reach actually is.
   */
  companies: CompanyRef[]
  /** Whether this person may use Talk at all. */
  talkEnabled: boolean
  /**
   * Where they may talk: one entry per company, its departments nested. An
   * entry with NO departments is the whole company. Detail read only, as above.
   */
  talkAccess: TalkGrant[]
  /**
   * PATCH only — true when the edit ended a live session (a role change or a
   * password reset does; a rename doesn't). Undefined on every other read.
   */
  sessionRevoked?: boolean
}

/**
 * A role the form may assign — every role of the account across ALL of its
 * companies, not just the active one.
 *
 * A role is the permission codes and the company it belongs to. It says nothing
 * about reach any more: that is picked per user, further down this same form.
 */
export interface AssignableRole {
  id: number
  name: string
  /** Becomes the user's company. Roles without one are never offered. */
  companyId: number
}
