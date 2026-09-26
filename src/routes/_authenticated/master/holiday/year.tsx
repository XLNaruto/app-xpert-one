import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { HolidayYearPage } from '@/features/master/holiday'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted { accountingYear }>` pre-fills the year being added. */
export const Route = createFileRoute('/_authenticated/master/holiday/year')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.holidays}:create`),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <HolidayYearPage data={data} />
}
