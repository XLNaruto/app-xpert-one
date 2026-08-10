import { createFileRoute } from '@tanstack/react-router'
import { SalaryViewDetailPage } from '@/features/hr/salary-view'
import { validateDataSearch } from '@/lib/route-search'

/**
 * `?data=<encrypted { id, employeeId, month, year }>` names the salary to show.
 * All four ride along because there is no `GET /salary/:id` — the row is read
 * back off the report for that employee and period.
 */
export const Route = createFileRoute('/_authenticated/hr/salary-view/detail')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <SalaryViewDetailPage data={data} />
}
