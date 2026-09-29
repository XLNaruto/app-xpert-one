import { createFileRoute } from '@tanstack/react-router'
import { SopAssignmentDetailPage } from '@/features/office-task/sop-assignment'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` names the assignment to show. */
export const Route = createFileRoute('/_authenticated/office-task/sop-assignment/detail')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <SopAssignmentDetailPage data={data} />
}
