import { createFileRoute } from '@tanstack/react-router'
import { PfOfficeAddressCreatePage } from '@/features/master/pf-office-address'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute(
  '/_authenticated/master/pf-office-address/create',
)({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <PfOfficeAddressCreatePage data={data} />
}
