import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { BulkWageHistoryPage } from '@/features/hr/bulk-wage'

export const Route = createFileRoute('/_authenticated/hr/bulk-wage/history')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.bulkWage}:read`),
  component: BulkWageHistoryPage,
})
