import { createFileRoute } from '@tanstack/react-router'
import { CompanyListPage } from '@/features/master/company'

export const Route = createFileRoute('/_authenticated/company/')({
  component: CompanyListPage,
})
