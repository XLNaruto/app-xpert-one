import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { DepartmentCreatePage } from '@/features/master/department'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/department/create')({
  // One page serves create and edit, so either action opens it.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      `${PERMISSIONS.departments}:create`,
      `${PERMISSIONS.departments}:update`,
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DepartmentCreatePage data={data} />
}
