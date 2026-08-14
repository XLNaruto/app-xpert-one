import type { AuditFields } from '@/types/audit'
import type { TalkCredentialStatus } from '../schemas'

/** A whole-company grant — every department in it, present and future. */
export interface TalkCredentialCompany {
  id: number
  name: string
}

/** A single-department grant, carrying the company it belongs to. */
export interface TalkCredentialDepartment {
  id: number
  name: string
  companyId: number
}

/**
 * One employee's Talk login.
 *
 * The same shape serves the list and the edit form, with each read answering a
 * different half and the mapper defaulting the rest:
 *
 * - a LIST row carries the audit block but **no reach** — resolving the grant
 *   names costs joins no column shows, so {@link companies} and
 *   {@link departments} land empty there whatever the credential actually holds;
 * - the DETAIL read carries the reach in full and no audit block.
 *
 * The password is on neither, and never will be: it's stored hashed, so the form
 * rotates it rather than showing it.
 */
export interface TalkCredential extends AuditFields {
  id: number
  /** Null once the employee has been deleted — the credential outlives them. */
  employeeId: number | null
  /** Null for the same reason. The row still has to be visible, to be revoked. */
  employeeName: string | null
  /** The Talk LOGIN. Unique across the whole platform, not just this account. */
  email: string
  /** `inactive` keeps the address taken and the history intact — see the delete note. */
  status: TalkCredentialStatus
  /** When the credential was last spent. Null until the first Talk sign-in. */
  lastLoginAt: string | null
  /**
   * WHOLE-COMPANY grants. Detail read only — empty on a list row, which is not
   * the same as "reaches nothing".
   */
  companies: TalkCredentialCompany[]
  /**
   * Single-department grants, independent of {@link companies}: a department may
   * be granted without its company being. Detail read only, as above.
   */
  departments: TalkCredentialDepartment[]
}
