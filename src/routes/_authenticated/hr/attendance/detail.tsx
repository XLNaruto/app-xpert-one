import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { AttendanceDetailPage } from '@/features/hr/attendance'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=` carries the group (and the day it was read on) into the screen. */
export const Route = createFileRoute('/_authenticated/hr/attendance/detail')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.attendance}:read`),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <AttendanceDetailPage data={data} />
}
