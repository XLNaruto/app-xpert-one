import { createFileRoute } from '@tanstack/react-router'
import { WeekoffPolicyListPage } from '@/features/master/weekoff-policy'

export const Route = createFileRoute('/_authenticated/master/weekoff-policy/')({
  component: WeekoffPolicyListPage,
})
