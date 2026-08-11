import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { FactoryOfficeAddressCreatePage } from '@/features/master/factory-office-address'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute(
  '/_authenticated/master/factory-office-address/create',
)({
  // One page serves create and edit, so either action opens it.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      `${PERMISSIONS.officeAddresses}:create`,
      `${PERMISSIONS.officeAddresses}:update`,
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <FactoryOfficeAddressCreatePage data={data} />
}
