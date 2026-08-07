import { createFileRoute } from '@tanstack/react-router'
import { BulkWageHistoryPage } from '@/features/hr/bulk-wage'

export const Route = createFileRoute('/_authenticated/hr/bulk-wage/history')({
  component: BulkWageHistoryPage,
})
