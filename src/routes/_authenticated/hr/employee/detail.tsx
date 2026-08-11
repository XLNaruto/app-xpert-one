import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { EmployeeDetailPage } from '@/features/hr/employee'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` names the employee to show; without it, "not found". */
export const Route = createFileRoute('/_authenticated/hr/employee/detail')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.employees}:read`),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <EmployeeDetailPage data={data} />
}
