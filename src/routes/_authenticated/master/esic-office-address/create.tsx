import { createFileRoute } from '@tanstack/react-router'
import { EsicOfficeAddressCreatePage } from '@/features/master/esic-office-address'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute(
  '/_authenticated/master/esic-office-address/create',
)({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <EsicOfficeAddressCreatePage data={data} />
}
