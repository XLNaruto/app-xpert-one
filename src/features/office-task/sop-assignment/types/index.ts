import type { AuditFields } from '@/types/audit'
import type { AssignmentStatus, SopItem, SopTask, TaskStatus } from '@/features/office-task/common'

/** One employee running one SOP group for a period. */
export interface SopAssignmentRow extends AuditFields {
  id: number
  /** Exactly one is set — an employee or a panel user. */
  employeeId: number | null
  userId: number | null
  employeeName: string
  employeeCode: string
  /** The employee's own department — for display only. */
  departmentName: string
  /** `null` once the group is deleted; `templateName` still reads correctly. */
  groupId: number | null
  templateName: string
  effectiveFrom: string
  /** `null` runs until stopped. */
  effectiveTo: string | null
  status: AssignmentStatus
  itemsCount: number
  customCount: number
  tasksPerDay: number
  hasStartedWork: boolean
  /** False once any run was worked (R8) — Stop stays available. */
  canDelete: boolean
}

export interface SopAssignmentFilters {
  /** '' = every group. */
  groupId: string
  status: string
}

/** An assigned item with how it's going: today's run(s) and all time logged on it. */
export interface SopAssignmentItem extends SopItem {
  custom: boolean
  /**
   * Today in one status — a running run wins, else the first run not yet
   * completed, else Completed — with how many of today's runs are done.
   * `null` when nothing is due today.
   */
  today: { status: TaskStatus; paused: boolean; done: number; total: number } | null
  /** Seconds worked across every run of this item, every day, live runs included. */
  workedSeconds: number
  hasStartedWork: boolean
}

/** The detail screen's header — the items and the runs load separately. */
export interface SopAssignmentDetail extends SopAssignmentRow {
  designationName: string
}

/** The window of runs the detail screen tracks, both ends inclusive (`yyyy-MM-dd`). */
export interface SopRunRange {
  from: string
  to: string
}

export type { SopTask }
