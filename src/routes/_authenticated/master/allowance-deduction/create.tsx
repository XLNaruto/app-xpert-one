import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { AllowanceDeductionCreatePage } from '@/features/master/allowance-deduction'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/allowance-deduction/create')(
  {
    // One page serves create and edit, so either action opens it.
    beforeLoad: ({ context }) =>
      requirePermission(context.queryClient, [
        `${PERMISSIONS.payComponents}:create`,
        `${PERMISSIONS.payComponents}:update`,
      ]),
    validateSearch: validateDataSearch,
    component: RouteComponent,
  },
)

function RouteComponent() {
  const { data } = Route.useSearch()
  return <AllowanceDeductionCreatePage data={data} />
}
