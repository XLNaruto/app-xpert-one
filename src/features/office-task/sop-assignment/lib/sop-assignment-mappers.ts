import { toAudit, toSopItem } from '@/features/office-task/common'
import type {
  SopAssignmentDetailResponse,
  SopAssignmentItemResponse,
  SopAssignmentRowResponse,
} from '../schemas'
import type { SopAssignmentDetail, SopAssignmentItem, SopAssignmentRow } from '../types'

export function toSopAssignmentRow(r: SopAssignmentRowResponse): SopAssignmentRow {
  return {
    ...toAudit(r),
    id: r.id,
    employeeId: r.employee_id,
    userId: r.user_id ?? null,
    employeeName: r.employee_name,
    employeeCode: r.employee_code ?? '',
    departmentName: r.department_name ?? '',
    groupId: r.group_id,
    templateName: r.template_name,
    effectiveFrom: r.effective_from,
    effectiveTo: r.effective_to,
    status: r.status,
    itemsCount: r.items_count,
    customCount: r.custom_count,
    tasksPerDay: r.tasks_per_day,
    hasStartedWork: r.has_started_work,
    canDelete: r.can_delete,
  }
}

export function toSopAssignmentDetail(r: SopAssignmentDetailResponse): SopAssignmentDetail {
  return { ...toSopAssignmentRow(r), designationName: r.designation_name ?? '' }
}

export function toSopAssignmentItem(r: SopAssignmentItemResponse): SopAssignmentItem {
  return {
    ...toSopItem(r),
    custom: r.custom,
    today: r.today,
    workedSeconds: r.worked_seconds,
    hasStartedWork: r.has_started_work ?? false,
  }
}
