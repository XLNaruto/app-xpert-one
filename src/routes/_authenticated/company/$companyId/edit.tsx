import { createFileRoute } from '@tanstack/react-router'
import { CompanyManagePage } from '@/features/master/company'

export const Route = createFileRoute('/_authenticated/company/$companyId/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  const { companyId } = Route.useParams()
  return <CompanyManagePage companyId={Number(companyId)} />
}
