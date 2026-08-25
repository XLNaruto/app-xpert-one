import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Chat Monitoring — permission gate for the module.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_workspace/talk/monitoring')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.talkMonitoring),
  component: Outlet,
})
