import { createFileRoute } from '@tanstack/react-router'
import { LeaveApprovalChainListPage } from '@/features/administration/leave-approval-chain'

export const Route = createFileRoute(
  '/_authenticated/administration/leave-approval-chain/',
)({
  component: LeaveApprovalChainListPage,
})
