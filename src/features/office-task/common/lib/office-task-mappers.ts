import type { AuditFields } from '@/types/audit'
import type {
  AuditResponse,
  OfficeTaskEmployeeResponse,
  ProgressNoteResponse,
  ProofResponse,
  SopItemResponse,
  SopRunResponse,
  VerdictResponse,
  WorkSessionResponse,
} from '../schemas'
import type {
  AssigneeKind,
  OfficeTaskEmployee,
  ProgressNote,
  ProofFile,
  SopItem,
  SopTask,
  VerdictInfo,
  WorkSession,
} from '../types'

/**
 * Pure response → record mappers shared by every Office Task module. No React,
 * no hooks — each module's own mappers build on these.
 */

/**
 * The audit block as the table's audit columns read it. The NAME is
 * `created_by_name` — `created_by` is the raw actor id — and it is `null` when
 * the writer wasn't a tenant user, which the audit stack renders as "—".
 */
export function toAudit(r: AuditResponse): AuditFields {
  return {
    createdAt: r.created_at,
    createdBy: r.created_by_name ?? '',
    updatedAt: r.updated_at ?? null,
    updatedBy: r.updated_by_name ?? null,
  }
}

export function toProof(r: ProofResponse): ProofFile {
  return { key: r.key, name: r.name, contentType: r.content_type ?? '' }
}

export const toProofs = (rows: ProofResponse[] | null | undefined): ProofFile[] =>
  (rows ?? []).map(toProof)

export function toVerdict(r: VerdictResponse): VerdictInfo {
  return {
    verdict: r.verdict,
    verdictRemarks: r.verdict_remarks ?? '',
    verdictBy: r.verdict_by ?? null,
    verdictAt: r.verdict_at ?? null,
  }
}

export function toSopItem(r: SopItemResponse): SopItem {
  return {
    id: r.id,
    task: r.task,
    description: r.description ?? '',
    frequency: r.frequency,
    photoRequired: r.photo_required,
    needsApproval: r.needs_approval,
  }
}

export function toSopTask(r: SopRunResponse): SopTask {
  return {
    ...toVerdict(r),
    id: r.id,
    itemId: r.item_id,
    assignmentId: r.assignment_id,
    employeeId: r.employee_id,
    userId: r.user_id ?? null,
    date: r.date,
    task: r.task,
    description: r.description ?? '',
    templateName: r.template_name,
    slot: r.slot,
    slots: r.slots,
    status: r.status,
    runningSince: r.running_since,
    workedSeconds: r.worked_seconds,
    photoRequired: r.photo_required,
    needsApproval: r.needs_approval,
    submittedAt: r.submitted_at,
    completedAt: r.completed_at,
    note: r.note ?? '',
    proof: toProofs(r.proof),
  }
}

export function toProgressNote(r: ProgressNoteResponse): ProgressNote {
  return {
    id: r.id,
    at: r.at,
    percent: r.percent,
    note: r.note ?? '',
    photos: toProofs(r.photos),
  }
}

export const toWorkSession = (r: WorkSessionResponse): WorkSession => ({ start: r.start, end: r.end })

export function toOfficeTaskEmployee(r: OfficeTaskEmployeeResponse): OfficeTaskEmployee {
  return {
    id: r.id,
    kind: r.user_id != null ? 'user' : 'employee',
    name: r.name,
    code: r.code ?? '',
    email: r.email ?? '',
    departmentId: r.department_id ?? null,
    departmentName: r.department_name ?? '',
    designationId: r.designation_id ?? null,
    roleId: r.role_id ?? null,
    alreadyAssigned: r.already_assigned ?? false,
    assignmentId: r.assignment_id ?? null,
  }
}

/** Who a target's work goes to: `pick_by: role` → panel users, else employees. */
export const assigneeKindOf = (pickBy: 'designation' | 'role'): AssigneeKind =>
  pickBy === 'role' ? 'user' : 'employee'

/**
 * `pick_by` + the one target id that matches it — the API refuses both or
 * neither, so the other key is left out of the body entirely.
 */
export function targetPayload(
  pickBy: 'designation' | 'role',
  designationId: string,
  roleId: string,
): { pick_by: 'designation' | 'role'; designation_id?: number; role_id?: number } {
  return pickBy === 'designation'
    ? { pick_by: pickBy, designation_id: Number(designationId) }
    : { pick_by: pickBy, role_id: Number(roleId) }
}
