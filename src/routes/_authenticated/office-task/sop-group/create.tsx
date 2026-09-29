import { createFileRoute } from '@tanstack/react-router'
import { SopGroupCreatePage } from '@/features/office-task/sop-group'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=` carries `{ id }` to edit, plus `tab: 'assign'` to open on Assign Employees. */
export const Route = createFileRoute('/_authenticated/office-task/sop-group/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <SopGroupCreatePage data={data} />
}
