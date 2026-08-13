import { createFileRoute } from '@tanstack/react-router'
import { AdminUserListPage } from '@/features/administration/admin-user'

export const Route = createFileRoute('/_authenticated/administration/admin-user/')({
  component: AdminUserListPage,
})
