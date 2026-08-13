import { createFileRoute } from '@tanstack/react-router'
import { SupportTicketListPage } from '@/features/support/ticket'

export const Route = createFileRoute('/_authenticated/support/ticket/')({
  component: SupportTicketListPage,
})
