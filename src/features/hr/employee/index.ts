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

export { useEmployees, useEmployee } from './api/use-employees'
export { employeeOptions } from './lib/employee-mappers'

export { EMPLOYEE_TABS, EMPLOYEE_TAB_LABELS, type EmployeeTab } from './constants'

export type {
  Employee,
  EmployeeAsset,
  EmployeeCompletedSteps,
  EmployeeDocument,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeFamilyMember,
  EmployeeKyc,
  EmployeeService,
  EmployeeTransfer,
  EmployeeTransferDetail,
  EmployeeWageStructure,
} from './types'
