export { CompanyShiftTab } from './components/company-shift-tab'
export { DepartmentShiftTab } from './components/department-shift-tab'
export { useShifts } from './api/use-shifts'
export {
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useSetDefaultShift,
  useClearDefaultShift,
} from './api/use-shift-mutations'
export { shiftOptions, formatShiftWindow, formatTime, toShift } from './lib/shift-mappers'
/**
 * The raw shift response and its mapper are exported because a shift comes back
 * nested inside another feature's payload: `GET /user/employees/:id/shift` answers
 * the resolved shift as a whole record. Parsing it there against a hand-copied
 * shape would be a second definition of the same thing.
 */
export { shiftResponseSchema } from './schemas'
export type { ShiftResponse } from './schemas'
export type { Shift } from './types'
