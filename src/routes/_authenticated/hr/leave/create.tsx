import { createFileRoute } from '@tanstack/react-router'
import { LeaveCreatePage } from '@/features/hr/leave'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/hr/leave/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <LeaveCreatePage data={data} />
}
