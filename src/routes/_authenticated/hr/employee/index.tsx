import { createFileRoute } from '@tanstack/react-router'
import { EmployeeListPage } from '@/features/hr/employee'

export const Route = createFileRoute('/_authenticated/hr/employee/')({
  component: EmployeeListPage,
})
