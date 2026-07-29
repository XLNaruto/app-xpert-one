import { createFileRoute } from '@tanstack/react-router'
import { LeaveTypeListPage } from '@/features/master/leave-type'

export const Route = createFileRoute('/_authenticated/master/leave-type/')({
  component: LeaveTypeListPage,
})
