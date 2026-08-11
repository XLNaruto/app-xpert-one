import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { CompanyDetailPage } from '@/features/master/company'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` carries the company to display. */
export const Route = createFileRoute('/_authenticated/master/company/detail')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.companies}:read`),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <CompanyDetailPage data={data} />
}
