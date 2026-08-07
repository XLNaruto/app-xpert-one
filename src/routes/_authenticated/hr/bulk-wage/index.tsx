import { createFileRoute } from '@tanstack/react-router'
import { BulkWagePage } from '@/features/hr/bulk-wage'

export const Route = createFileRoute('/_authenticated/hr/bulk-wage/')({
  component: BulkWagePage,
})
