import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Roles & Permissions — permission gate for the module's list / create routes.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/administration/role')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.roles),
  component: Outlet,
})
