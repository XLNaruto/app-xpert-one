/**
 * Employee Management — the module's public surface.
 *
 * Three screens: the register, the eight-step wizard (create *and* edit), and the
 * read-only 360° view. Cross-feature imports come through here, never through a
 * deep path.
 */
export { EmployeeListPage } from './pages/employee-list-page'
export { EmployeeCreatePage } from './pages/employee-create-page'
export { EmployeeDetailPage } from './pages/employee-detail-page'

export { useEmployees, useEmployee, useEmployeePicker } from './api/use-employees'
/**
 * Step 9's reads. `useEmployeeShiftOnDay` in particular answers "which shift is
 * this person on, on this date, and why" — the question attendance screens will ask
 * — so it's part of the module's surface rather than the tab's private business.
 */
export {
  useEmployeeShiftOnDay,
  useEmployeeShiftAssignments,
  useEmployeeRoster,
} from './api/use-employee-shifts'
/**
 * Step 3's read — what the employee is actually paid and by which tier (their own
 * override, or the designation's template). Payroll screens ask the same question.
 */
export { useEmployeeWage } from './api/use-employee-wage'
export { employeeOptions, employeePickerOptions } from './lib/employee-mappers'
export { assignmentLabel, SHIFT_SOURCE_LABELS } from './lib/employee-shift-mappers'

export { EMPLOYEE_TABS, EMPLOYEE_TAB_LABELS, type EmployeeTab } from './constants'

export type {
  Employee,
  EmployeeAsset,
  EmployeeCompletedSteps,
  EmployeeDocument,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeFace,
  EmployeeFamilyMember,
  EmployeeKyc,
  EmployeeKycSummary,
  EmployeePickerEntry,
  EmployeeRosterEntry,
  EmployeeService,
  EmployeeShiftAssignment,
  EmployeeShiftOnDay,
  EmployeeTransfer,
  EmployeeTransferDetail,
  EmployeeWage,
  EmployeeWageSource,
  EmployeeWageStructure,
  EmployeeWageVersion,
} from './types'
