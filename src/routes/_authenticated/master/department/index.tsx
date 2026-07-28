import { createFileRoute } from '@tanstack/react-router'
import { DepartmentListPage } from '@/features/master/department'

export const Route = createFileRoute('/_authenticated/master/department/')({
  component: DepartmentListPage,
})
