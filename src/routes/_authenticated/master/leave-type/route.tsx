import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Leave Types — permission gate for the module's list / create / detail routes.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/master/leave-type')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.leaveTypes),
  component: Outlet,
})
