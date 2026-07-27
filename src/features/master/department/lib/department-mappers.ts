import type { DepartmentFormValues } from '../schemas'
import type { Department } from '../types'

/** Hydrate the edit form from a stored department. */
export function departmentToFormValues(department: Department): DepartmentFormValues {
  return {
    branch: department.branch,
    departmentName: department.departmentName,
    departmentCode: department.departmentCode,
    monthStartDate: String(department.monthStartDate),
  }
}
