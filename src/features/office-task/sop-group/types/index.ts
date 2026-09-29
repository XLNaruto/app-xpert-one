import type { AuditFields } from '@/types/audit'
import type { PickBy, SopItem } from '@/features/office-task/common'

/** A group as the list shows it — its target resolved, daily load summed. */
export interface SopGroupRow extends AuditFields {
  id: number
  name: string
  pickBy: PickBy
  designationId: number | null
  roleId: number | null
  /** The designation or role name it applies to. */
  appliesTo: string
  sortOrder: number
  itemsCount: number
  /** Sum of item frequencies — runs one employee gets per day. */
  tasksPerDay: number
  anyPhoto: boolean
  anyApproval: boolean
  /** Employees currently running this group. */
  activeAssignees: number
  /** Somebody has worked a run (R1) — Delete is gone for good. */
  hasStartedWork: boolean
  canDelete: boolean
  /**
   * The group has ≥ 1 ACTIVE assignee, so `pickBy` / designation / role are
   * frozen (R2). Independent of `hasStartedWork`: somebody assigned this
   * morning who hasn't pressed Start locks the target but not the delete.
   */
  targetLocked: boolean
}

/** Tab 1 in edit mode, and the "View checklist" preview. */
export interface SopGroupDetail extends SopGroupRow {
  designationName: string
  roleName: string
  items: SopItem[]
}

/** A custom task on one assignment; `hasStartedWork` makes it read-only for good. */
export interface SopCustomTask extends SopItem {
  hasStartedWork: boolean
}

/** Somebody who currently runs the group (tab 2). */
export interface SopGroupAssignee {
  assignmentId: number
  /** Whichever of `employeeId` / `userId` is set — the id the picker lists them by. */
  personId: number
  employeeId: number | null
  userId: number | null
  employeeName: string
  employeeCode: string
  departmentName: string
  effectiveFrom: string
  effectiveTo: string | null
  hasStartedWork: boolean
  /** False once they've started — Stop from SOP Assignments instead (R6). */
  canRemove: boolean
  /** The COPY made at assignment time — may differ from the group's items. */
  heldChecklist: SopItem[]
  customTasks: SopCustomTask[]
}

export interface SopGroupOption {
  id: number
  name: string
}

/** What tab 2's Save did. */
export interface SaveAssigneesResult {
  assigned: number
  updated: number
}

/** A delete on the edit screen that goes to the API straight away, after a confirm. */
export type SopGroupRemoval =
  | { kind: 'item'; index: number; itemId: number; label: string }
  | { kind: 'assignee'; index: number; assignmentId: number; label: string }
  | {
      kind: 'custom'
      assigneeIndex: number
      taskIndex: number
      assignmentId: number
      itemId: number
      label: string
    }
