import { createFileRoute } from '@tanstack/react-router'
import { DesignationCreatePage } from '@/features/master/designation'
import { validateDataSearch } from '@/lib/route-search'

/**
 * `?data=<encrypted-token>` switches the create page into edit mode. The token
 * carries the designation id and, in edit mode, which tab is open — so a refresh
 * comes back to that tab with neither value showing in the address bar.
 */
export const Route = createFileRoute('/_authenticated/master/designation/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DesignationCreatePage data={data} />
}
