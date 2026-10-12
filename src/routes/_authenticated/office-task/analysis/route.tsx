import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Task Analysis — permission gate for the list and the employee detail. Like the
 * other Office Task `:list` codes it's a real role checkbox, so the exact code
 * is asked for, matching the sidebar row.
 */
export const Route = createFileRoute('/_authenticated/office-task/analysis')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.taskAnalysis}:list`),
  component: Outlet,
})
