import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Project Tasks — permission gate for the module's routes. The Office Task `:list`
 * codes are real checkboxes on a role (only the owner holds them by default),
 * so the exact code is asked for, matching the sidebar row.
 */
export const Route = createFileRoute('/_authenticated/office-task/project-task')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.projectTasks}:list`),
  component: Outlet,
})
