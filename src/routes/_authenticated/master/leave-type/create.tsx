import { createFileRoute } from '@tanstack/react-router'
import { LeaveTypeCreatePage } from '@/features/master/leave-type'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/leave-type/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <LeaveTypeCreatePage data={data} />
}
