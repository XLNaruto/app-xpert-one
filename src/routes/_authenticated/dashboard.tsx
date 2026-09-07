import { createFileRoute } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'
import { DashboardPage } from '@/features/dashboard'

/**
 * The tenant dashboard. All six `/user/dashboard/*` reads are gated on the
 * single code `dashboard:read`, so the gate here is the same one the screen
 * itself asks — hiding the sidebar row alone wouldn't stop someone typing
 * `/dashboard`, and a 403 caught in `beforeLoad` renders the Forbidden screen
 * rather than a page shell full of broken panels.
 */
export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.dashboard}:read`),
  component: DashboardPage,
})
