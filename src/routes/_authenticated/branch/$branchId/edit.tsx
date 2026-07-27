import { createFileRoute } from '@tanstack/react-router'
import { BranchManagePage } from '@/features/master/branch'

export const Route = createFileRoute('/_authenticated/branch/$branchId/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  const { branchId } = Route.useParams()
  return <BranchManagePage branchId={Number(branchId)} />
}
