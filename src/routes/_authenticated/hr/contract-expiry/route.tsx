import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Contract Expiry — the module's permission gate.
 *
 * Gated on `employees`, the resource both actions on the screen write to
 * (`employees:update`). The list itself is readable a little more widely — the
 * API takes `dashboard:read` OR `employees:list` — and that wider read is what
 * the dashboard card uses; a user who only holds it sees the contracts there.
 * This screen is the working one, so it asks for the employee resource.
 */
export const Route = createFileRoute('/_authenticated/hr/contract-expiry')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.employees),
  component: Outlet,
})
