import { createFileRoute } from '@tanstack/react-router'
import { PtRateListPage } from '@/features/master/pt-rate'

export const Route = createFileRoute('/_authenticated/master/pt-rate/')({
  component: PtRateListPage,
})
