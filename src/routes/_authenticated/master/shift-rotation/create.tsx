import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { ShiftRotationCreatePage } from '@/features/master/shift-rotation'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/shift-rotation/create')({
  // One page serves create and edit, so either action opens it.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      `${PERMISSIONS.shiftRotations}:create`,
      `${PERMISSIONS.shiftRotations}:update`,
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <ShiftRotationCreatePage data={data} />
}
