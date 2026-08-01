import { OfficeAddressCreatePage } from '@/features/master/office-address'
import { FACTORY_OFFICE_ADDRESS_SCREEN } from '../constants'

interface FactoryOfficeAddressCreatePageProps {
  /**
   * Encrypted office address id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/** Create/edit a FACTORY office address. */
export function FactoryOfficeAddressCreatePage({ data }: FactoryOfficeAddressCreatePageProps) {
  return <OfficeAddressCreatePage screen={FACTORY_OFFICE_ADDRESS_SCREEN} data={data} />
}
