import type { DropzoneFile } from '@/components/common/file-dropzone'
import type {
  Priority,
  ProgressNote,
  ProofFile,
  SopTask,
  TaskStatus,
  TaskSubmissionMode,
  UpdateFrequency,
  VerdictInfo,
} from '@/features/office-task/common'

export type MyTaskTab = 'sop' | 'project'

/** The status chips over the table. */
export type MyTaskFilter = 'all' | 'todo' | 'in_hand' | 'done' | 'missed'

/** One of my SOP runs — `workedSeconds` INCLUDES a live stretch, up to when it was read. */
export type MySopRow = SopTask

/** One of my project shares, with the task's own fields alongside. */
export interface MyProjectRow extends VerdictInfo {
  /** The WORK id — what start / progress / complete are addressed by. */
  id: number
  taskId: number
  task: string
  description: string
  priority: Priority
  startDate: string
  deadline: string
  /**
   * Progress notes expected per period (the API's `updates_per_day`), the period,
   * and how many were recorded on the viewed day / in its current period.
   */
  updatesPerDay: number
  updateFrequency: UpdateFrequency
  updatesToday: number
  updatesThisPeriod: number
  /**
   * The "other" this row is worked for — set when the user is their delegate.
   * Its clock is THEIR clock: the user's own running task doesn't block it.
   */
  onBehalfOf: OnBehalfOf | null
  photoRequired: boolean
  needsVerification: boolean
  status: TaskStatus
  latestPercent: number
  /** When the running clock started, or `null` when stopped. */
  runningSince: string | null
  /** Seconds from FINISHED sessions only — the live one is added on screen. */
  workedSeconds: number
  startedAt: string | null
  submittedAt: string | null
  completedAt: string | null
  note: string
  proof: ProofFile[]
  progress: ProgressNote[]
}

/** The outside person a delegated project row belongs to. */
export interface OnBehalfOf {
  taskOtherId: number
  fullName: string
  mobileNumber: string
}

/** What the Complete / Submit dialog is handing in. */
export type CompleteTarget =
  | { kind: 'sop'; row: MySopRow }
  | { kind: 'project'; row: MyProjectRow }

/** A hand-in — the picked files are uploaded first, then only their keys are sent. */
export interface HandInInput {
  id: number
  note: string
  files: DropzoneFile[]
}

export interface ProgressInput {
  id: number
  percent: number
  note: string
  files: DropzoneFile[]
  /** Stop the running clock with this update — the ONLY way a project share is stopped. */
  stop?: boolean
}

/** What a hand-in became: done, or waiting on an approver. */
export type HandInStatus = 'completed' | 'pending_approval'

/** How the active company hands work in, per kind of task. */
export interface MyTaskSettings {
  sop: TaskSubmissionMode
  project: TaskSubmissionMode
}
