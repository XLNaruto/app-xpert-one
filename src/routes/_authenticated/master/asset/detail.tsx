import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { AssetDetailPage } from '@/features/master/asset'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` carries the asset whose variants are shown. */
export const Route = createFileRoute('/_authenticated/master/asset/detail')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.assets}:read`),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <AssetDetailPage data={data} />
}
