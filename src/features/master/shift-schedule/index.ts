/**
 * Off-Day Schedule — the module's public surface.
 *
 * One screen (the grid) plus the reads and writes another feature might want:
 * the schedule outranks the week-off policy wherever it has an entry, so an
 * employee screen can show or change one date through here.
 */
export { ShiftScheduleListPage } from './pages/shift-schedule-list-page'

export { useShiftSchedules, useEmployeeSchedule } from './api/use-shift-schedules'
export {
  useGenerateShiftSchedule,
  useSetScheduleDay,
  useResetScheduleDay,
} from './api/use-shift-schedule-mutations'

export type {
  ScheduleDay,
  ScheduleEmployeeRow,
  ScheduleGrid,
  ScheduleFilters,
  ScheduleGenerateResult,
  ScheduleSourceType,
} from './types'
