import { createFileRoute } from '@tanstack/react-router'
import { RoleListPage } from '@/features/administration/role'

export const Route = createFileRoute('/_authenticated/administration/role/')({
  component: RoleListPage,
})
