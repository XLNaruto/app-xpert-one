import type { Priority, ProofFile, SopTask, TaskStatus, Verdict, VerdictInfo } from '@/features/office-task/common'

export type ApprovalKind = 'sop' | 'project'

/** The status tabs inside each kind. */
export type ApprovalTab = 'awaiting' | 'approved' | 'rejected' | 'all'

export interface ApprovalFilters {
  /**
   * Inclusive window — the run's own `date` on the SOP list, the DATE PART of
   * `submitted_at` on the project list (a share has no day of its own).
   */
  from: string
  to: string
  departmentId: string
  /** Work given to an employee (a designation pick). */
  employeeId: string
  /** Work given to a panel user (a role pick) — independent of `employeeId`. */
  userId: string
  tab: ApprovalTab
}

/** An SOP run awaiting (or given) a sign-off. */
export interface SopApprovalRow extends SopTask {
  employeeName: string
  employeeCode: string
  departmentName: string
}

/** A project share handed in on a task that needs verification. */
export interface ProjectApprovalRow extends VerdictInfo {
  id: number
  taskId: number
  task: string
  description: string
  priority: Priority
  deadline: string
  photoRequired: boolean
  /** Exactly one is set — an employee or a panel user (department is empty for a user). */
  employeeId: number | null
  userId: number | null
  employeeName: string
  employeeCode: string
  departmentName: string
  status: TaskStatus
  latestPercent: number
  submittedAt: string | null
  completedAt: string | null
  workedSeconds: number
  note: string
  proof: ProofFile[]
  /** Handed in after the deadline — derived on read, never stored. */
  isLate: boolean
}

/** A page plus how many rows sit under each status tab (for the tab badges). */
export interface ApprovalPage<T> {
  items: T[]
  total: number
  /** Computed with every filter EXCEPT the tab. */
  counts: Record<ApprovalTab, number>
}

/** What the verdict dialog is about to answer. */
export interface VerdictRequest {
  verdict: Verdict
  kind: ApprovalKind
  rows: (SopApprovalRow | ProjectApprovalRow)[]
}

export interface DecideInput {
  ids: number[]
  verdict: Verdict
  remarks: string
}
