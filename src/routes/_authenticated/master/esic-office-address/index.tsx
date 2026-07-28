import { createFileRoute } from '@tanstack/react-router'
import { EsicOfficeAddressListPage } from '@/features/master/esic-office-address'

export const Route = createFileRoute('/_authenticated/master/esic-office-address/')({
  component: EsicOfficeAddressListPage,
})
