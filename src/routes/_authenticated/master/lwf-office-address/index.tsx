import { createFileRoute } from '@tanstack/react-router'
import { LwfOfficeAddressListPage } from '@/features/master/lwf-office-address'

export const Route = createFileRoute('/_authenticated/master/lwf-office-address/')({
  component: LwfOfficeAddressListPage,
})
