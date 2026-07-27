import { createFileRoute } from '@tanstack/react-router'
import { BranchManagePage } from '@/features/master/branch'

export const Route = createFileRoute('/_authenticated/branch/new')({
  component: BranchManagePage,
})
