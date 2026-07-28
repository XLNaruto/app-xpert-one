import { createFileRoute } from '@tanstack/react-router'
import { EmploymentExchangeOfficeAddressCreatePage } from '@/features/master/employment-exchange-office-address'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute(
  '/_authenticated/master/employment-exchange-office-address/create',
)({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <EmploymentExchangeOfficeAddressCreatePage data={data} />
}
