import { createFileRoute } from '@tanstack/react-router'
import { FactoryOfficeAddressCreatePage } from '@/features/master/factory-office-address'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute(
  '/_authenticated/master/factory-office-address/create',
)({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <FactoryOfficeAddressCreatePage data={data} />
}
