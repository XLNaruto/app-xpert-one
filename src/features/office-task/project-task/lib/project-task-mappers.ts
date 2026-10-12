import {
  delegateValue,
  parseDelegateValue,
  targetPayload,
  toAudit,
  toProgressNote,
  toProofs,
  toVerdict,
  toWorkSession,
} from '@/features/office-task/common'
import type {
  BulkEditPayload,
  OtherAssigneePayload,
  BulkEditValues,
  ProjectTaskFormValues,
  ProjectTaskPayload,
  ProjectTaskResponse,
  ProjectWorkActivityResponse,
  ProjectWorkDetailResponse,
  ProjectWorkRowResponse,
} from '../schemas'
import type {
  OtherAssigneeFields,
  ProjectTaskRow,
  ProjectWorkActivity,
  ProjectWorkDetail,
  ProjectWorkRow,
} from '../types'

// ── Responses ──────────────────────────────────────────────────────────────

type OtherAssigneeResponse = Pick<ProjectWorkRowResponse, 'task_other_id' | 'mobile_number' | 'delegate'>

function toOtherFields(r: OtherAssigneeResponse): OtherAssigneeFields {
  return {
    taskOtherId: r.task_other_id ?? null,
    mobileNumber: r.mobile_number ?? null,
    delegate: r.delegate
      ? {
          employeeId: r.delegate.employee_id ?? null,
          userId: r.delegate.user_id ?? null,
          name: r.delegate.name,
        }
      : null,
  }
}

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
      ...toOtherFields(a),
      personId: a.employee_id ?? a.user_id ?? a.task_other_id ?? 0,
      employeeId: a.employee_id,
      userId: a.user_id ?? null,
      name: a.name,
      hasStarted: a.has_started,
    })),
    updatesPerDay: r.updates_per_day,
    updateFrequency: r.update_frequency ?? 'daily',
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
    ...toOtherFields(r),
    id: r.id,
    employeeId: r.employee_id,
    userId: r.user_id ?? null,
    employeeName: r.employee_name,
    employeeCode: r.employee_code ?? '',
    status: r.status,
    latestPercent: r.latest_percent,
    updatesToday: r.updates_today,
    updatesThisPeriod: r.updates_this_period ?? r.updates_today,
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
    updatesPerDay: r.updates_per_day ?? null,
    updateFrequency: r.update_frequency ?? null,
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

/** The delegate of an "other" as the dropdown's value — `''` for nobody. */
export function delegateToValue(d: OtherAssigneeFields['delegate']): string {
  if (d?.employeeId) return delegateValue('employee', d.employeeId)
  if (d?.userId) return delegateValue('user', d.userId)
  return ''
}

export function projectTaskToFormValues(t: ProjectTaskRow): ProjectTaskFormValues {
  // An "other" task has exactly one assignee — the person themselves.
  const other = t.pickBy === 'other' ? t.assignees[0] : undefined
  return {
    pickBy: t.pickBy,
    designationId: t.designationId ? String(t.designationId) : '',
    roleId: t.roleId ? String(t.roleId) : '',
    employeeIds: other ? [] : t.assignees.map((a) => String(a.personId)),
    otherName: other?.name ?? '',
    otherMobile: other?.mobileNumber ?? '',
    delegate: delegateToValue(other?.delegate ?? null),
    task: t.task,
    priority: t.priority,
    description: t.description,
    updatesPerDay: String(t.updatesPerDay),
    updateFrequency: t.updateFrequency,
    startDate: t.startDate,
    deadline: t.deadline,
    photoRequired: t.photoRequired,
    needsVerification: t.needsVerification,
  }
}

/** The `other` block — always the complete value; no delegate id clears the delegate. */
function otherToPayload(v: ProjectTaskFormValues): OtherAssigneePayload {
  const delegate = parseDelegateValue(v.delegate)
  return {
    full_name: v.otherName.trim(),
    mobile_number: v.otherMobile.trim(),
    ...(delegate?.kind === 'employee' ? { delegate_employee_id: delegate.id } : {}),
    ...(delegate?.kind === 'user' ? { delegate_user_id: delegate.id } : {}),
  }
}

/** Who it's for: the target and its people, or — for an "other" — just the `other` block. */
function whoToPayload(v: ProjectTaskFormValues): Pick<
  ProjectTaskPayload,
  'pick_by' | 'designation_id' | 'role_id' | 'employee_ids' | 'user_ids' | 'other'
> {
  if (v.pickBy === 'other') return { pick_by: 'other', other: otherToPayload(v) }
  return {
    ...targetPayload(v.pickBy, v.designationId, v.roleId),
    // Named after the target, and always sent — so a switch of `pick_by`
    // carries its new people in the same request.
    ...(v.pickBy === 'role'
      ? { user_ids: v.employeeIds.map(Number) }
      : { employee_ids: v.employeeIds.map(Number) }),
  }
}

export function projectTaskToPayload(v: ProjectTaskFormValues): ProjectTaskPayload {
  return {
    task: v.task.trim(),
    description: v.description.trim(),
    priority: v.priority,
    ...whoToPayload(v),
    updates_per_day: Number(v.updatesPerDay),
    update_frequency: v.updateFrequency,
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
