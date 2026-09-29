import { createFileRoute } from '@tanstack/react-router'
import { ApprovalListPage } from '@/features/office-task/approval'

export const Route = createFileRoute('/_authenticated/office-task/approval/')({
  component: ApprovalListPage,
})
