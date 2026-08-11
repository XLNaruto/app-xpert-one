import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { AttendanceEmployeePage } from '@/features/hr/attendance'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=` carries the employee (and the group to go back to) into the screen. */
export const Route = createFileRoute('/_authenticated/hr/attendance/employee')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.attendance}:read`),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <AttendanceEmployeePage data={data} />
}
