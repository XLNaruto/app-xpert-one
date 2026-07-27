import { createFileRoute } from '@tanstack/react-router'
import { BranchDetailPage } from '@/features/master/branch'

export const Route = createFileRoute('/_authenticated/branch/$branchId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { branchId } = Route.useParams()
  return <BranchDetailPage branchId={Number(branchId)} />
}
