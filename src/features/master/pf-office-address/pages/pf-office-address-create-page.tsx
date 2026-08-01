import { OfficeAddressCreatePage } from '@/features/master/office-address'
import { PF_OFFICE_ADDRESS_SCREEN } from '../constants'

interface PfOfficeAddressCreatePageProps {
  /**
   * Encrypted office address id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/** Create/edit a PF office address. */
export function PfOfficeAddressCreatePage({ data }: PfOfficeAddressCreatePageProps) {
  return <OfficeAddressCreatePage screen={PF_OFFICE_ADDRESS_SCREEN} data={data} />
}
