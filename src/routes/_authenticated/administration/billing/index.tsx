import { createFileRoute } from '@tanstack/react-router'
import { BillingDetailPage } from '@/features/administration/billing'

export const Route = createFileRoute('/_authenticated/administration/billing/')({
  component: BillingDetailPage,
})
