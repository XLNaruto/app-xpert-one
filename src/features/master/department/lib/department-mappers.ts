import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  DepartmentFormValues,
  DepartmentResponse,
  DepartmentUpdatePayload,
} from '../schemas'
import type { Department } from '../types'

/**
 * API record → the UI department. The audit trail only comes back on the list
 * rows; on a single-record response it's absent and renders as a dash. The
 * branch name isn't part of the response at all — `withBranchNames()` fills it
 * in from the branch master.
 */
export function toDepartment(response: DepartmentResponse): Department {
  return {
    id: response.id,
    companyId: response.company_id,
    branchId: response.branch_id,
    branchName: '',
    departmentName: response.name,
    departmentCode: response.code ?? '',
    monthStartDay: response.month_start_day,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a record between
 * tenants, so the update body stops here.
 */
export function departmentToPayload(
  values: DepartmentFormValues,
): DepartmentUpdatePayload {
  return {
    branch_id: values.branchId ? Number(values.branchId) : null,
    name: values.departmentName.trim(),
    month_start_day: values.monthStartDay ? Number(values.monthStartDay) : null,
  }
}

/** Hydrate the edit form from a stored department. */
export function departmentToFormValues(department: Department): DepartmentFormValues {
  return {
    branchId: department.branchId === null ? '' : String(department.branchId),
    departmentName: department.departmentName,
    monthStartDay: department.monthStartDay === null ? '' : String(department.monthStartDay),
  }
}

/**
 * Dropdown options for the pickers that assign something to a department. The
 * value is the department's **id** — that's what `department_id` expects —
 * while the label is the name the user picks by.
 */
export function departmentOptions(departments: Department[]): ComboboxOption[] {
  return departments.map((department) => ({
    label: department.departmentName,
    value: String(department.id),
  }))
}

/**
 * Resolve each row's branch name against the branch master. The departments
 * endpoint sends `branch_id` alone, so the list screen joins the two — a branch
 * it can't find (or a department pinned to none) reads as a dash.
 */
export function withBranchNames(
  rows: Department[],
  branches: { id: number; branchName: string }[],
): Department[] {
  const byId = new Map(branches.map((branch) => [branch.id, branch.branchName]))
  return rows.map((row) => ({
    ...row,
    branchName: (row.branchId !== null && byId.get(row.branchId)) || '—',
  }))
}
