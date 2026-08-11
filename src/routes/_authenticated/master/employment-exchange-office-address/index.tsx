import { createFileRoute } from '@tanstack/react-router'
import { EmploymentExchangeOfficeAddressListPage } from '@/features/master/employment-exchange-office-address'

export const Route = createFileRoute(
  '/_authenticated/master/employment-exchange-office-address/',
)({
  component: EmploymentExchangeOfficeAddressListPage,
})
