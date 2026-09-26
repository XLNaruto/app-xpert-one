import { createFileRoute } from '@tanstack/react-router'
import { ShiftScheduleListPage } from '@/features/master/shift-schedule'

export const Route = createFileRoute('/_authenticated/master/shift-schedule/')({
  component: ShiftScheduleListPage,
})
