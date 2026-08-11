import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Employee Management — permission gate for the module's list / create / detail routes.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/hr/employee')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.employees),
  component: Outlet,
})
