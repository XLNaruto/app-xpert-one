import { createFileRoute } from '@tanstack/react-router'
import { DepartmentManagePage } from '@/features/master/department'

export const Route = createFileRoute('/_authenticated/department/$departmentId/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  const { departmentId } = Route.useParams()
  return <DepartmentManagePage departmentId={Number(departmentId)} />
}
