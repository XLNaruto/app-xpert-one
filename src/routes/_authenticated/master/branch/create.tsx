import { createFileRoute } from '@tanstack/react-router'
import { BranchCreatePage } from '@/features/master/branch'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/branch/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <BranchCreatePage data={data} />
}
