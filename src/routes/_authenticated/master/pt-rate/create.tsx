import { createFileRoute } from '@tanstack/react-router'
import { PtRateCreatePage } from '@/features/master/pt-rate'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/pt-rate/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <PtRateCreatePage data={data} />
}
