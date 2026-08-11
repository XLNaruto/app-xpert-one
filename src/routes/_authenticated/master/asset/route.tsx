import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Assets — permission gate for the module's list / create / detail routes.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/master/asset')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.assets),
  component: Outlet,
})
