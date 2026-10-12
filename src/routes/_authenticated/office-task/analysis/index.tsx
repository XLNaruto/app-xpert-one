import { createFileRoute } from '@tanstack/react-router'
import { AnalysisListPage } from '@/features/office-task/analysis'

export const Route = createFileRoute('/_authenticated/office-task/analysis/')({
  component: AnalysisListPage,
})
