import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Employee Support — permission gate for the queue and one ticket's thread.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 *
 * Gated on EITHER spelling of the resource — see the note on
 * `PERMISSIONS.employeeSupport`. An array spec is an ANY-of, so an account whose
 * catalog only carries `support` keeps the screen.
 */
export const Route = createFileRoute('/_authenticated/support/employee-ticket')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, [
      PERMISSIONS.employeeSupport,
      PERMISSIONS.support,
    ]),
  component: Outlet,
})
