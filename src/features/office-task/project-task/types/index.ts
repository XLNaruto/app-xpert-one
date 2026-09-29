import type { AuditFields } from '@/types/audit'
import type {
  PickBy,
  Priority,
  ProgressNote,
  ProofFile,
  TaskStatus,
  Verdict,
  VerdictInfo,
  WorkSession,
} from '@/features/office-task/common'

/** One person on a project task; `hasStarted` means they can't be removed (R12). */
export interface ProjectAssignee {
  /** Whichever of `employeeId` / `userId` is set — what the picker lists them by. */
  personId: number
  employeeId: number | null
  userId: number | null
  name: string
  hasStarted: boolean
}

/** A project task as the list (and the edit drawer) shows it. */
export interface ProjectTaskRow extends AuditFields {
  id: number
  task: string
  description: string
  priority: Priority
  pickBy: PickBy
  designationId: number | null
  roleId: number | null
  /** The designation or role name it targets. */
  appliesTo: string
  designationName: string
  roleName: string
  assignees: ProjectAssignee[]
  /** Progress notes each assignee is expected to record per day (1–24). */
  updatesPerDay: number
  startDate: string
  deadline: string
  photoRequired: boolean
  needsVerification: boolean
  /** Rolled up across the assignees — a share awaiting approval reads `in_progress`. */
  status: TaskStatus
  /** Mean of each assignee's latest percent (a completed share counts 100). */
  progress: number
  hasStartedWork: boolean
  /** Every share completed — the task is read-only (R13). */
  isCompleted: boolean
  canDelete: boolean
  /** API field names the drawer must disable: `[]`, the R10 set, or everything once completed. */
  lockedFields: string[]
}

export type ProjectTaskDetail = ProjectTaskRow

export interface ProjectTaskFilters {
  status: string
  priority: string
}

/** One assignee's share as the task's Employees table lists it. */
export interface ProjectWorkRow {
  id: number
  /** Exactly one is set — an employee or a panel user. */
  employeeId: number | null
  userId: number | null
  employeeName: string
  employeeCode: string
  status: TaskStatus
  latestPercent: number
  updatesToday: number
  startedAt: string | null
  submittedAt: string | null
  completedAt: string | null
  /** Seconds on the clock across every session, the running one up to now. */
  workedSeconds: number
  /** When the running session began, or `null` when the clock is stopped. */
  runningSince: string | null
  verdict: Verdict | null
}

/** One share in full — the employee page's summary and hand-in. */
export interface ProjectWorkDetail extends ProjectWorkRow, VerdictInfo {
  taskId: number
  task: string
  deadline: string
  totalUpdates: number
  lastUpdateAt: string | null
  note: string
  proof: ProofFile[]
}

/** The raw pieces the activity timeline is built from, oldest first. */
export interface ProjectWorkActivity {
  sessions: WorkSession[]
  progress: ProgressNote[]
}

/** What the list's drawer is showing. */
export type ProjectTaskDrawer = { mode: 'create' } | { mode: 'edit'; id: number }
