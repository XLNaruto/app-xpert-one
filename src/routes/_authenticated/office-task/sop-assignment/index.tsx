import { createFileRoute } from '@tanstack/react-router'
import { SopAssignmentListPage } from '@/features/office-task/sop-assignment'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=` may carry `{ groupId }` to open narrowed to one SOP group. */
export const Route = createFileRoute('/_authenticated/office-task/sop-assignment/')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <SopAssignmentListPage data={data} />
}
