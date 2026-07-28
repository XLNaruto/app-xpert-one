import { createFileRoute } from '@tanstack/react-router'
import { EsicRateCreatePage } from '@/features/master/esic-rate'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/esic-rate/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <EsicRateCreatePage data={data} />
}
