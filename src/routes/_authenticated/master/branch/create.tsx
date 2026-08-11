import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { BranchCreatePage } from '@/features/master/branch'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/branch/create')({
  // One page serves create and edit, so either action opens it.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      `${PERMISSIONS.branches}:create`,
      `${PERMISSIONS.branches}:update`,
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <BranchCreatePage data={data} />
}
