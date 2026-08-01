import { OfficeAddressListPage } from '@/features/master/office-address'
import { PF_OFFICE_ADDRESS_SCREEN } from '../constants'

/** PF Office Address master — the EPFO regional/sub-regional offices branches register with. */
export function PfOfficeAddressListPage() {
  return <OfficeAddressListPage screen={PF_OFFICE_ADDRESS_SCREEN} />
}
