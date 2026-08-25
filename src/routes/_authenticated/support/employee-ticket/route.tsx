import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Employee Support — permission gate for the queue and one ticket's thread.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/support/employee-ticket')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.employeeHelpdesk),
  component: Outlet,
})
