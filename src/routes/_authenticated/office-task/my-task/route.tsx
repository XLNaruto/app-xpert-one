import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * My Tasks — permission gate for the module's routes. The Office Task `:list`
 * codes are real checkboxes on a role (only the owner holds them by default),
 * so the exact code is asked for, matching the sidebar row.
 */
export const Route = createFileRoute('/_authenticated/office-task/my-task')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.myTasks}:list`),
  component: Outlet,
})
