import { createFileRoute } from '@tanstack/react-router'
import { DepartmentManagePage } from '@/features/master/department'

export const Route = createFileRoute('/_authenticated/department/new')({
  component: DepartmentManagePage,
})
