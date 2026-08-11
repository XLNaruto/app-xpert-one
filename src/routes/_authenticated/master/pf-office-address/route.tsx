import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * PF Office Address — permission gate for the module's list / create / detail routes.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/master/pf-office-address')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.officeAddresses),
  component: Outlet,
})
