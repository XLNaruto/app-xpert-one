import { createFileRoute } from '@tanstack/react-router'
import { ProjectTaskEmployeePage } from '@/features/office-task/project-task'
import { validateDataSearch } from '@/lib/route-search'

/** `?data=<encrypted { id, workId }>` — the task, and which assignee's work on it. */
export const Route = createFileRoute('/_authenticated/office-task/project-task/employee')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <ProjectTaskEmployeePage data={data} />
}
