import { createFileRoute } from '@tanstack/react-router'
import { EmployeeTicketListPage } from '@/features/support/employee-ticket'

export const Route = createFileRoute('/_authenticated/support/employee-ticket/')({
  component: EmployeeTicketListPage,
})
