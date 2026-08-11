/**
 * Attendance Management — the module's public surface.
 *
 * Three screens, each a drill-down of the one before: the company's day as cards
 * (one per department, or per designation — the server decides), the people
 * behind one card, and one person's month resolved day by day. Cross-feature
 * imports come through here, never through a deep path.
 */
export { AttendanceListPage } from './pages/attendance-list-page'
export { AttendanceDetailPage } from './pages/attendance-detail-page'
export { AttendanceEmployeePage } from './pages/attendance-employee-page'

export {
  useAttendanceGroups,
  useAttendanceGroupEmployees,
  useAttendanceMonth,
} from './api/use-attendance'
export type { AttendanceEmployeeFilters } from './api/attendance-api'

export type {
  AttendanceDay,
  AttendanceDayStatus,
  AttendanceEmployee,
  AttendanceGroup,
  AttendanceGroupBy,
  AttendanceMonthResult,
  AttendancePunch,
  AttendanceStatus,
  AttendanceStatusFilter,
  AttendanceTotals,
} from './types'
