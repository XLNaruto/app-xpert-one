import { createFileRoute } from '@tanstack/react-router'
import { ProjectTaskListPage } from '@/features/office-task/project-task'

/** One page: list + add/edit/view drawers. */
export const Route = createFileRoute('/_authenticated/office-task/project-task/')({
  component: ProjectTaskListPage,
})
