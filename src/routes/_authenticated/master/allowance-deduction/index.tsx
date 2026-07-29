import { createFileRoute } from '@tanstack/react-router'
import { AllowanceDeductionListPage } from '@/features/master/allowance-deduction'

export const Route = createFileRoute('/_authenticated/master/allowance-deduction/')({
  component: AllowanceDeductionListPage,
})
