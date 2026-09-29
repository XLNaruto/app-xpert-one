import { createFileRoute } from '@tanstack/react-router'
import { ProjectTaskDetailPage } from '@/features/office-task/project-task'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted-id>` names the project task to show. */
export const Route = createFileRoute('/_authenticated/office-task/project-task/detail')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <ProjectTaskDetailPage data={data} />
}
