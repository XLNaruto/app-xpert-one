import { createFileRoute } from '@tanstack/react-router'
import { CompanyDetailPage } from '@/features/master/company'

export const Route = createFileRoute('/_authenticated/company/$companyId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { companyId } = Route.useParams()
  return <CompanyDetailPage companyId={Number(companyId)} />
}
