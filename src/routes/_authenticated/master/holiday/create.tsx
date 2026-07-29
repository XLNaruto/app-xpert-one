import { createFileRoute } from '@tanstack/react-router'
import { HolidayCreatePage } from '@/features/master/holiday'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/holiday/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <HolidayCreatePage data={data} />
}
