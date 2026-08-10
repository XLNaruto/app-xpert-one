import { createFileRoute } from '@tanstack/react-router'
import { SalaryViewListPage } from '@/features/hr/salary-view'

export const Route = createFileRoute('/_authenticated/hr/salary-view/')({
  component: SalaryViewListPage,
})
