import { createFileRoute } from '@tanstack/react-router'
import { SalaryPage } from '@/features/hr/salary'

export const Route = createFileRoute('/_authenticated/hr/salary/')({
  component: SalaryPage,
})
