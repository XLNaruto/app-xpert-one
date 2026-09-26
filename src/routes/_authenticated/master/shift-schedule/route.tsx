import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Off-Day Schedule — permission gate for the module's routes. Asks for the exact
 * `:list` code: unlike its neighbours it isn't default-granted, and the grid is
 * what `:list` opens. Hiding the sidebar row alone doesn't stop someone typing
 * the URL.
 */
export const Route = createFileRoute('/_authenticated/master/shift-schedule')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.shiftSchedules}:list`),
  component: Outlet,
})
