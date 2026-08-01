import { OfficeAddressCreatePage } from '@/features/master/office-address'
import { LWF_OFFICE_ADDRESS_SCREEN } from '../constants'

interface LwfOfficeAddressCreatePageProps {
  /**
   * Encrypted office address id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/** Create/edit a LWF office address. */
export function LwfOfficeAddressCreatePage({ data }: LwfOfficeAddressCreatePageProps) {
  return <OfficeAddressCreatePage screen={LWF_OFFICE_ADDRESS_SCREEN} data={data} />
}
