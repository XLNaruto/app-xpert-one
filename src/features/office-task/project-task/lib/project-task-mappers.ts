import {
  targetPayload,
  toAudit,
  toProgressNote,
  toProofs,
  toVerdict,
  toWorkSession,
} from '@/features/office-task/common'
import type {
  BulkEditPayload,
  BulkEditValues,
  ProjectTaskFormValues,
  ProjectTaskPayload,
  ProjectTaskResponse,
  ProjectWorkActivityResponse,
  ProjectWorkDetailResponse,
  ProjectWorkRowResponse,
} from '../schemas'
import type {
  ProjectTaskRow,
  ProjectWorkActivity,
  ProjectWorkDetail,
  ProjectWorkRow,
} from '../types'

// ── Responses ──────────────────────────────────────────────────────────────

export function toProjectTaskRow(r: ProjectTaskResponse): ProjectTaskRow {
  return {
    ...toAudit(r),
    id: r.id,
    task: r.task,
    description: r.description ?? '',
    priority: r.priority,
    pickBy: r.pick_by,
    designationId: r.designation_id,
    roleId: r.role_id,
    appliesTo: r.applies_to ?? '',
    designationName: r.designation_name ?? '',
    roleName: r.role_name ?? '',
    assignees: r.assignees.map((a) => ({
      personId: a.employee_id ?? a.user_id ?? 0,
      employeeId: a.employee_id,
      userId: a.user_id ?? null,
      name: a.name,
      hasStarted: a.has_started,
    })),
    updatesPerDay: r.updates_per_day,
    startDate: r.start_date,
    deadline: r.deadline,
    photoRequired: r.photo_required,
    needsVerification: r.needs_verification,
    status: r.status,
    progress: r.progress,
    hasStartedWork: r.has_started_work,
    isCompleted: r.is_completed,
    canDelete: r.can_delete,
    lockedFields: r.locked_fields,
  }
}

export function toProjectWorkRow(r: ProjectWorkRowResponse): ProjectWorkRow {
  return {
    id: r.id,
    employeeId: r.employee_id,
    userId: r.user_id ?? null,
    employeeName: r.employee_name,
    employeeCode: r.employee_code ?? '',
    status: r.status,
    latestPercent: r.latest_percent,
    updatesToday: r.updates_today,
    startedAt: r.started_at,
    submittedAt: r.submitted_at,
    completedAt: r.completed_at,
    workedSeconds: r.worked_seconds,
    runningSince: r.running_since,
    verdict: r.verdict,
  }
}

export function toProjectWorkDetail(r: ProjectWorkDetailResponse): ProjectWorkDetail {
  return {
    ...toProjectWorkRow(r),
    ...toVerdict(r),
    taskId: r.task_id,
    task: r.task,
    deadline: r.deadline,
    totalUpdates: r.total_updates,
    lastUpdateAt: r.last_update_at,
    note: r.note ?? '',
    proof: toProofs(r.proof),
  }
}

export function toProjectWorkActivity(r: ProjectWorkActivityResponse): ProjectWorkActivity {
  return { sessions: r.sessions.map(toWorkSession), progress: r.progress.map(toProgressNote) }
}

// ── Form ───────────────────────────────────────────────────────────────────

export function projectTaskToFormValues(t: ProjectTaskRow): ProjectTaskFormValues {
  return {
    pickBy: t.pickBy,
    designationId: t.designationId ? String(t.designationId) : '',
    roleId: t.roleId ? String(t.roleId) : '',
    employeeIds: t.assignees.map((a) => String(a.personId)),
    task: t.task,
    priority: t.priority,
    description: t.description,
    updatesPerDay: String(t.updatesPerDay),
    startDate: t.startDate,
    deadline: t.deadline,
    photoRequired: t.photoRequired,
    needsVerification: t.needsVerification,
  }
}

export function projectTaskToPayload(v: ProjectTaskFormValues): ProjectTaskPayload {
  return {
    task: v.task.trim(),
    description: v.description.trim(),
    priority: v.priority,
    ...targetPayload(v.pickBy, v.designationId, v.roleId),
    // Named after the target, and always sent — so a switch of `pick_by`
    // carries its new people in the same request.
    ...(v.pickBy === 'role'
      ? { user_ids: v.employeeIds.map(Number) }
      : { employee_ids: v.employeeIds.map(Number) }),
    updates_per_day: Number(v.updatesPerDay),
    start_date: v.startDate,
    deadline: v.deadline,
    photo_required: v.photoRequired,
    needs_verification: v.needsVerification,
  }
}

/** The bulk bar — an untouched field goes as `null`, which the API leaves alone. */
export function bulkEditToPayload(ids: number[], v: BulkEditValues): BulkEditPayload {
  return {
    ids,
    priority: (v.priority || null) as BulkEditPayload['priority'],
    start_date: v.startDate || null,
    deadline: v.deadline || null,
  }
}
