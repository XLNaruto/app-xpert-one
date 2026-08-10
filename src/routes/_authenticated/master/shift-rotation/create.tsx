import { createFileRoute } from '@tanstack/react-router'
import { ShiftRotationCreatePage } from '@/features/master/shift-rotation'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/shift-rotation/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <ShiftRotationCreatePage data={data} />
}
