import { createFileRoute } from '@tanstack/react-router'
import { BonusEstimationPage } from '@/features/hr/bonus-estimation'

export const Route = createFileRoute('/_authenticated/hr/bonus-estimation/')({
  component: BonusEstimationPage,
})
