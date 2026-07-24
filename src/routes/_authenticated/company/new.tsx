import { createFileRoute } from '@tanstack/react-router'
import { CompanyManagePage } from '@/features/master/company'

export const Route = createFileRoute('/_authenticated/company/new')({
  component: CompanyManagePage,
})
