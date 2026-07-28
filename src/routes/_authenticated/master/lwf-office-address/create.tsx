import { createFileRoute } from '@tanstack/react-router'
import { LwfOfficeAddressCreatePage } from '@/features/master/lwf-office-address'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute(
  '/_authenticated/master/lwf-office-address/create',
)({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <LwfOfficeAddressCreatePage data={data} />
}
