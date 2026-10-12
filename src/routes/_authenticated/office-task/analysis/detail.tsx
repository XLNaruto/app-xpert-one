import { createFileRoute } from '@tanstack/react-router'
import { AnalysisDetailPage } from '@/features/office-task/analysis'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted { id, kind, from, to }>` — the employee, and the tab and window the list was on. */
export const Route = createFileRoute('/_authenticated/office-task/analysis/detail')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <AnalysisDetailPage data={data} />
}
