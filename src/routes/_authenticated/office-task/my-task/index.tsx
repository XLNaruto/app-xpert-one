import { createFileRoute } from '@tanstack/react-router'
import { MyTaskListPage } from '@/features/office-task/my-task'

export const Route = createFileRoute('/_authenticated/office-task/my-task/')({
  component: MyTaskListPage,
})
