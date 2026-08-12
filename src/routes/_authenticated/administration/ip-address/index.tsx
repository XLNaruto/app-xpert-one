import { createFileRoute } from '@tanstack/react-router'
import { IpAddressListPage } from '@/features/administration/ip-address'

export const Route = createFileRoute('/_authenticated/administration/ip-address/')({
  component: IpAddressListPage,
})
