import { createFileRoute } from '@tanstack/react-router'
import { FactoryOfficeAddressListPage } from '@/features/master/factory-office-address'

export const Route = createFileRoute('/_authenticated/master/factory-office-address/')({
  component: FactoryOfficeAddressListPage,
})
