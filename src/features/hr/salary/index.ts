export { SalaryPage } from './pages/salary-page'
export { useSalaryRegister } from './api/use-salary-register'
/**
 * The discard, shared with the View Salary screen — it removes the same stored
 * salaries from the other end, so both screens send the same request and pick up
 * the same invalidation rather than each owning a copy of it.
 */
export { useDeleteSalaries } from './api/use-salary-mutations'
export { salaryMonthBounds } from './constants'
export type {
  SalaryAttendance,
  SalaryDeleteResult,
  SalaryFigures,
  SalaryHead,
  SalaryPeriod,
  SalaryRegister,
  SalaryRegisterRow,
  SalaryTotals,
} from './types'
export type { SalaryRegisterFilters, SalaryRow, SalaryStatus } from './schemas'
