import { OfficeAddressListPage } from '@/features/master/office-address'
import { ESIC_OFFICE_ADDRESS_SCREEN } from '../constants'

/** ESIC Office Address master — the ESIC regional and branch offices establishments register with. */
export function EsicOfficeAddressListPage() {
  return <OfficeAddressListPage screen={ESIC_OFFICE_ADDRESS_SCREEN} />
}
