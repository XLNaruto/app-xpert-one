import { toProofs, toSopTask, toVerdict } from '@/features/office-task/common'
import type { ProjectApprovalResponse, SopApprovalResponse } from '../schemas'
import type { ProjectApprovalRow, SopApprovalRow } from '../types'

export function toSopApprovalRow(r: SopApprovalResponse): SopApprovalRow {
  return {
    ...toSopTask(r),
    employeeName: r.employee_name,
    employeeCode: r.employee_code ?? '',
    departmentName: r.department_name ?? '',
  }
}

export function toProjectApprovalRow(r: ProjectApprovalResponse): ProjectApprovalRow {
  return {
    ...toVerdict(r),
    id: r.id,
    taskId: r.task_id,
    task: r.task,
    description: r.description ?? '',
    priority: r.priority,
    deadline: r.deadline,
    photoRequired: r.photo_required,
    employeeId: r.employee_id,
    userId: r.user_id ?? null,
    employeeName: r.employee_name,
    employeeCode: r.employee_code ?? '',
    departmentName: r.department_name ?? '',
    status: r.status,
    latestPercent: r.latest_percent ?? 0,
    submittedAt: r.submitted_at,
    completedAt: r.completed_at,
    workedSeconds: r.worked_seconds ?? 0,
    note: r.note ?? '',
    proof: toProofs(r.proof),
    isLate: r.is_late,
  }
}
