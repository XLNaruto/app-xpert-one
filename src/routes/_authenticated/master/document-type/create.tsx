import { createFileRoute } from '@tanstack/react-router'
import { DocumentTypeCreatePage } from '@/features/master/document-type'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` switches the create page into edit mode. */
export const Route = createFileRoute('/_authenticated/master/document-type/create')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <DocumentTypeCreatePage data={data} />
}
