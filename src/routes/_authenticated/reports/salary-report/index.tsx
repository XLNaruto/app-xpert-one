import { createFileRoute } from '@tanstack/react-router'
import { SalaryReportPage } from '@/features/reports/salary-report'

export const Route = createFileRoute('/_authenticated/reports/salary-report/')({
  component: SalaryReportPage,
})
