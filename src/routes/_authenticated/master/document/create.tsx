import { createFileRoute } from '@tanstack/react-router'
import { DocumentCreatePage } from '@/features/master/document'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/document/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DocumentCreatePage data={data} />
}
