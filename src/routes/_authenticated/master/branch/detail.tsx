import { createFileRoute } from '@tanstack/react-router'
import { BranchDetailPage } from '@/features/master/branch'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` carries the branch to display. */
export const Route = createFileRoute('/_authenticated/master/branch/detail')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <BranchDetailPage data={data} />
}
