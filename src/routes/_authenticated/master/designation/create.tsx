import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { DesignationCreatePage } from '@/features/master/designation'
import { validateDataSearch } from '@/lib/route-search'

/**
 * `?data=<encrypted-token>` switches the create page into edit mode. The token
 * carries the designation id and, in edit mode, which tab is open — so a refresh
 * comes back to that tab with neither value showing in the address bar.
 */
export const Route = createFileRoute('/_authenticated/master/designation/create')({
  // One page serves create and edit, so either action opens it.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      `${PERMISSIONS.designations}:create`,
      `${PERMISSIONS.designations}:update`,
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DesignationCreatePage data={data} />
}
