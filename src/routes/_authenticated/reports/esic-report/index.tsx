import { createFileRoute } from '@tanstack/react-router'
import { EsicReportPage } from '@/features/reports/esic-report'

export const Route = createFileRoute('/_authenticated/reports/esic-report/')({
  component: EsicReportPage,
})
