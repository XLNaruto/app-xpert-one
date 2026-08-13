import { createFileRoute } from '@tanstack/react-router'
import { PfReportPage } from '@/features/reports/pf-report'

export const Route = createFileRoute('/_authenticated/reports/pf-report/')({
  component: PfReportPage,
})
