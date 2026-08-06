import { createFileRoute } from '@tanstack/react-router'
import { LeaveListPage } from '@/features/hr/leave'

export const Route = createFileRoute('/_authenticated/hr/leave/')({
  component: LeaveListPage,
})
