import { createFileRoute } from '@tanstack/react-router'
import { DepartmentCreatePage } from '@/features/master/department'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/department/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DepartmentCreatePage data={data} />
}
