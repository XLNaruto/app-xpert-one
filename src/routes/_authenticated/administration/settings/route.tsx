import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Settings — permission gate for the module's one route. Opening it needs
 * `settings:read`; Save is gated separately on `settings:update`.
 */
export const Route = createFileRoute('/_authenticated/administration/settings')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.settings}:read`),
  component: Outlet,
})
