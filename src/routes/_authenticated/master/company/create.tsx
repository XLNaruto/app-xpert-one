import { createFileRoute } from '@tanstack/react-router'
import { CompanyCreatePage } from '@/features/master/company'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/company/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <CompanyCreatePage data={data} />
}
