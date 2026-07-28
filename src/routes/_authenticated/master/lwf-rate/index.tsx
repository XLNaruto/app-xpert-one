import { createFileRoute } from '@tanstack/react-router'
import { LwfRateListPage } from '@/features/master/lwf-rate'

export const Route = createFileRoute('/_authenticated/master/lwf-rate/')({
  component: LwfRateListPage,
})
