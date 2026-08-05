import { createFileRoute } from '@tanstack/react-router'
import { EmployeeCreatePage } from '@/features/hr/employee'
import { validateDataSearch } from '@/lib/route-search'

/**
 * `?data=` switches the wizard into edit mode. The token carries the employee id
 * and the step that was open, so a refresh comes back to the same tab.
 */
export const Route = createFileRoute('/_authenticated/hr/employee/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <EmployeeCreatePage data={data} />
}
