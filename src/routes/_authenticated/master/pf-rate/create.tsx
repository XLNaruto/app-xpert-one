import { createFileRoute } from '@tanstack/react-router'
import { PfRateCreatePage } from '@/features/master/pf-rate'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/pf-rate/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <PfRateCreatePage data={data} />
}
