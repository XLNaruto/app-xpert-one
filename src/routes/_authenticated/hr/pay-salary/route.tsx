import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PERMISSIONS, requirePermission } from '@/features/permissions'

/**
 * Pay Salary — permission gate for the module's list and history routes.
 * Hiding the sidebar row alone doesn't stop someone typing the URL.
 */
export const Route = createFileRoute('/_authenticated/hr/pay-salary')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, PERMISSIONS.paySalary),
  component: Outlet,
})
