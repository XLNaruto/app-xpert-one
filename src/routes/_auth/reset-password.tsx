import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import { ResetPasswordPage } from '@/features/auth'

export const Route = createFileRoute('/_auth/reset-password')({
  beforeLoad: ({ location }) => {
    if (!location.state.email) throw redirect({ to: '/forgot-password' })
  },
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const email = useLocation({ select: (l) => l.state.email ?? '' })
  return <ResetPasswordPage email={email} />
}
