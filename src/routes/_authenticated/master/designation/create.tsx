import { createFileRoute } from '@tanstack/react-router'
import { DesignationCreatePage } from '@/features/master/designation'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/designation/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DesignationCreatePage data={data} />
}
