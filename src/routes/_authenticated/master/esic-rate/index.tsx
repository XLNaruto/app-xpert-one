import { createFileRoute } from '@tanstack/react-router'
import { EsicRateListPage } from '@/features/master/esic-rate'

export const Route = createFileRoute('/_authenticated/master/esic-rate/')({
  component: EsicRateListPage,
})
