import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { DocumentCreatePage } from '@/features/master/document'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/document/create')({
  // One page serves create and edit, so either action opens it.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      `${PERMISSIONS.documents}:create`,
      `${PERMISSIONS.documents}:update`,
    ]),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DocumentCreatePage data={data} />
}
