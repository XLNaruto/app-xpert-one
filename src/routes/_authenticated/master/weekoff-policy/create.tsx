import { createFileRoute } from '@tanstack/react-router'
import { WeekoffPolicyCreatePage } from '@/features/master/weekoff-policy'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/weekoff-policy/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <WeekoffPolicyCreatePage data={data} />
}
