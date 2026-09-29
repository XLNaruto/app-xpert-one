/**
 * Shared shapes for every Office Task module — the SOP and project flows both
 * move work through the same statuses and carry the same proof and verdict.
 * Each is the API's own record, camelCased by the mappers in `lib/`.
 */

/** Where one piece of work stands. `missed` only ever appears on an SOP run. */
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'
  | 'missed'

/** The approver's answer on a handed-in piece of work; `null` is still awaiting. */
export type Verdict = 'approved' | 'rejected'

export type Priority = 'high' | 'medium' | 'low'

/** Whether an SOP group / project task targets people by designation or role. */
export type PickBy = 'designation' | 'role'

export type AssignmentStatus = 'active' | 'stopped'

/**
 * One proof-of-work file as the API returns it. `key` is a storage path — the
 * screen joins it with the `media_path` config (see `ProofStrip`), and
 * `contentType` is derived server-side from the key's extension.
 */
export interface ProofFile {
  key: string
  name: string
  contentType: string
}

/** A proof file as a write sends it — the server derives the content type. */
export interface ProofInput {
  key: string
  name: string
}

/** The verdict block both task kinds carry once an approver has answered. */
export interface VerdictInfo {
  verdict: Verdict | null
  /** `''` when unset. */
  verdictRemarks: string
  /** The approver's NAME, not an id. */
  verdictBy: string | null
  verdictAt: string | null
}

/** One checklist line — of a group, of a held copy, or a custom task. */
export interface SopItem {
  id: number
  task: string
  description: string
  /** Runs per day, 1–24. */
  frequency: number
  photoRequired: boolean
  needsApproval: boolean
}

/**
 * One generated run of one SOP item for one employee on one day — the same
 * shape in the assignment history, the approval queue and My Tasks.
 */
export interface SopTask extends VerdictInfo {
  id: number
  itemId: number
  assignmentId: number
  /** Exactly one is set — an employee (designation pick) or a panel user (role pick). */
  employeeId: number | null
  userId: number | null
  /** `yyyy-MM-dd`, the company's business day. */
  date: string
  task: string
  description: string
  templateName: string
  /** 1-based run number within the day, of `slots`. */
  slot: number
  slots: number
  status: TaskStatus
  /** When the live stretch began; `null` while paused / not running. */
  runningSince: string | null
  /**
   * Seconds worked, INCLUDING a stretch running right now (counted up to the
   * moment the server answered).
   */
  workedSeconds: number
  photoRequired: boolean
  needsApproval: boolean
  submittedAt: string | null
  completedAt: string | null
  note: string
  proof: ProofFile[]
}

/** One progress note on a project share. */
export interface ProgressNote {
  id: number
  /** ISO date-time. */
  at: string
  percent: number
  note: string
  photos: ProofFile[]
}

/** One stretch of the clock running on a project share — Start to Stop. */
export interface WorkSession {
  /** ISO date-time. */
  start: string
  /** ISO date-time; `null` while the clock is still running. */
  end: string | null
}

/**
 * Who a piece of work is given to: an employee (a designation target) or a
 * panel user (a role target). It follows `pick_by`.
 */
export type AssigneeKind = 'employee' | 'user'

/**
 * A row of the shared picker (`GET /user/office-task/employees`) — an employee
 * on a designation search, a panel user on a role search.
 */
export interface OfficeTaskEmployee {
  /** The id to post back — under `employee_id(s)` or `user_id(s)`, per `kind`. */
  id: number
  kind: AssigneeKind
  name: string
  /** Employee code; `''` for a panel user. */
  code: string
  /** A panel user's email — what a role search matches on. */
  email: string
  departmentId: number | null
  departmentName: string
  designationId: number | null
  /** The employee's panel login's role — `null` when they have no login. */
  roleId: number | null
  /** Already runs the group the picker was opened for (`sop_group_id`). */
  alreadyAssigned: boolean
  assignmentId: number | null
}
