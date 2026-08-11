import { createFileRoute } from '@tanstack/react-router'
import { AttendanceListPage } from '@/features/hr/attendance'

export const Route = createFileRoute('/_authenticated/hr/attendance/')({
  component: AttendanceListPage,
})
