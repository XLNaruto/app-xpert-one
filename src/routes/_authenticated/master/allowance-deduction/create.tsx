import { createFileRoute } from '@tanstack/react-router'
import { AllowanceDeductionCreatePage } from '@/features/master/allowance-deduction'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute(
  '/_authenticated/master/allowance-deduction/create',
)({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <AllowanceDeductionCreatePage data={data} />
}
