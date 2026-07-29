import { createFileRoute } from '@tanstack/react-router'
import { HolidayListPage } from '@/features/master/holiday'

export const Route = createFileRoute('/_authenticated/master/holiday/')({
  component: HolidayListPage,
})
