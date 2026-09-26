import { createFileRoute } from '@tanstack/react-router'
import { BillingHistoryPage } from '@/features/administration/billing'

/** Purchase history — gated with the rest of billing by the parent `route.tsx`. */
export const Route = createFileRoute('/_authenticated/administration/billing/history')({
  component: BillingHistoryPage,
})
