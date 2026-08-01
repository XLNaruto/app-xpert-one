import { OfficeAddressCreatePage } from '@/features/master/office-address'
import { ESIC_OFFICE_ADDRESS_SCREEN } from '../constants'

interface EsicOfficeAddressCreatePageProps {
  /**
   * Encrypted office address id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/** Create/edit a ESIC office address. */
export function EsicOfficeAddressCreatePage({ data }: EsicOfficeAddressCreatePageProps) {
  return <OfficeAddressCreatePage screen={ESIC_OFFICE_ADDRESS_SCREEN} data={data} />
}
