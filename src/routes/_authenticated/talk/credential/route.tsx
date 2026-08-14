import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Talk Credential — permission gate for the module's list / create routes.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/talk/credential')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.talkCredentials),
  component: Outlet,
})
