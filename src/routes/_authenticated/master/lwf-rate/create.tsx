import { createFileRoute } from '@tanstack/react-router'
import { LwfRateCreatePage } from '@/features/master/lwf-rate'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/lwf-rate/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <LwfRateCreatePage data={data} />
}
