import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * IP Access Control — permission gate for the module's one route. Hiding the
 * sidebar row alone doesn't stop someone typing the URL.
 *
 * Gated on the READ actions, not the bare resource: a role can hold the module
 * (so the sidebar row shows) without holding the right to see its entries, and
 * a bare-resource check would wave that role straight through to a screen whose
 * every request the API refuses. Naming the actions turns that into the
 * Forbidden screen before a single call goes out.
 */
export const Route = createFileRoute('/_authenticated/administration/ip-address')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, `${PERMISSIONS.ipAddresses}:read`),
  component: Outlet,
})
