import { createFileRoute } from '@tanstack/react-router'
import { PfOfficeAddressListPage } from '@/features/master/pf-office-address'

export const Route = createFileRoute('/_authenticated/master/pf-office-address/')({
  component: PfOfficeAddressListPage,
})
