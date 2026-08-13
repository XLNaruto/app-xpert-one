import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Users — permission gate for the module's list / create routes. Hiding the
 * sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/administration/admin-user')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.users),
  component: Outlet,
})
