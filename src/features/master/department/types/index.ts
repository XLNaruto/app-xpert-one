import type { AuditFields } from '@/types/audit'

/**
 * A department master record as consumed by the UI (camelCase), mapped from the
 * raw `/user/departments` response.
 */
export interface Department extends AuditFields {
  id: number
  /** The tenant the record belongs to — the company the session has active. */
  companyId: number
  /** The branch it sits under; what the API stores and the form picks. */
  branchId: number | null
  /**
   * That branch's name. The endpoint only sends `branch_id`, so the list screen
   * resolves this against the branch master and it reads blank until it does.
   */
  branchName: string
  departmentName: string
  /** Generated server-side — shown on the list, never captured on the form. */
  departmentCode: string
  /** Day of the month the department's cycle starts (1–31), or `null` to follow the calendar month. */
  monthStartDay: number | null
  /**
   * Hours one shift may run before an unclosed check-in counts as abandoned.
   * Overrides the company's value for this department's staff; `null` inherits
   * it (and the platform default of 18 when the company has none).
   */
  shiftHours: number | null
}
