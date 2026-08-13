import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { SupportTicketDetailPage } from '@/features/support/ticket'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` names the ticket being read. */
export const Route = createFileRoute('/_authenticated/support/ticket/detail')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.support}:read`),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <SupportTicketDetailPage data={data} />
}
