import { createFileRoute } from '@tanstack/react-router'
import { PaySalaryPage } from '@/features/hr/pay-salary'

export const Route = createFileRoute('/_authenticated/hr/pay-salary/')({
  component: PaySalaryPage,
})
