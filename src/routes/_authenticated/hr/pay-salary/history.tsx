import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { validateDataSearch } from '@/lib/route-search'
import { PaySalaryHistoryPage } from '@/features/hr/pay-salary'

/**
 * The period and department the history opens on ride in the encrypted `?data=`
 * token, so no raw department id reaches the address bar.
 */
export const Route = createFileRoute('/_authenticated/hr/pay-salary/history')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.paySalary}:read`),
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <PaySalaryHistoryPage data={data} />
}
