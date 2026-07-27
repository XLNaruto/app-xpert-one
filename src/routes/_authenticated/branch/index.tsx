import { createFileRoute } from '@tanstack/react-router'
import { BranchListPage } from '@/features/master/branch'

export const Route = createFileRoute('/_authenticated/branch/')({
  component: BranchListPage,
})
