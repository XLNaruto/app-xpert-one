import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Hierarchy Management → Leave — permission gate for the module's one route.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 *
 * Gated on `:read`, which is grantable to a role. `:update` is owner-only and is
 * checked on the screen instead, so a role that may LOOK at the chain gets the
 * screen read-only rather than a Forbidden.
 */
export const Route = createFileRoute(
  '/_authenticated/administration/leave-approval-chain',
)({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.leaveApprovalChain}:read`),
  component: Outlet,
})
