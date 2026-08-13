import { createFileRoute } from '@tanstack/react-router'
import { PtReportPage } from '@/features/reports/pt-report'

export const Route = createFileRoute('/_authenticated/reports/pt-report/')({
  component: PtReportPage,
})
