import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { EmployeeTicketDetailPage } from '@/features/support/employee-ticket'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` names the ticket whose thread is being opened. */
export const Route = createFileRoute('/_authenticated/support/employee-ticket/detail')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      `${PERMISSIONS.employeeSupport}:read`,
      `${PERMISSIONS.support}:read`,
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <EmployeeTicketDetailPage data={data} />
}
