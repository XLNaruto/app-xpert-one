import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Raise Support — permission gate for the module's list / create / detail
 * routes. Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/support/ticket')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.support),
  component: Outlet,
})
