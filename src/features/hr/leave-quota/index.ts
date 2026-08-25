/**
 * Paid-leave allowances — the module's public surface.
 *
 * No screens of its own: the grids are tabs mounted inside the designation form
 * and the employee wizard, because an allowance is a property of a role or a
 * person rather than a register in its own right.
 *
 * Both grids write to a SAVED record — `/user/designations/:id/leave-quotas` and
 * `/user/employees/:id/leave-quotas`. There is no draft variant: until the record
 * has an id there is nothing to attach an allowance to, which is why the
 * designation create form shows the tab LOCKED rather than editable.
 */
export { DesignationLeaveQuotaTab } from './components/designation-leave-quota-tab'
export { EmployeeLeaveQuotaTab } from './components/employee-leave-quota-tab'

export {
  useDesignationLeaveQuotas,
  useEmployeeLeaveQuotas,
  useSaveDesignationLeaveQuotas,
  useSaveEmployeeLeaveQuotas,
} from './api/use-leave-quotas'

export type {
  DesignationLeaveQuotas,
  EmployeeLeaveQuotas,
  LeaveQuotaRow,
  LeaveQuotaSaveRow,
  LeaveQuotaFallbackSource,
} from './types'
