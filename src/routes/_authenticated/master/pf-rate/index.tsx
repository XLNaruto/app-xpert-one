import { createFileRoute } from '@tanstack/react-router'
import { PfRateListPage } from '@/features/master/pf-rate'

export const Route = createFileRoute('/_authenticated/master/pf-rate/')({
  component: PfRateListPage,
})
