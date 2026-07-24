import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import { VerifyOtpPage } from '@/features/auth'

export const Route = createFileRoute('/_auth/verify-otp')({
  beforeLoad: ({ location }) => {
    // Email is carried in history state, not the URL → start over if missing.
    if (!location.state.email) throw redirect({ to: '/forgot-password' })
  },
  component: VerifyOtpRoute,
})

function VerifyOtpRoute() {
  const email = useLocation({ select: (l) => l.state.email ?? '' })
  return <VerifyOtpPage email={email} />
}
