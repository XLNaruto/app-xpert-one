import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { CompanyCreatePage } from '@/features/master/company'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/company/create')({
  // One page serves create and edit, so either action opens it.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      `${PERMISSIONS.companies}:create`,
      `${PERMISSIONS.companies}:update`,
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <CompanyCreatePage data={data} />
}
