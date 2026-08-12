import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Billing — permission gate for the module's routes. Hiding the sidebar row
 * alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/administration/billing')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.billing),
  component: Outlet,
})
