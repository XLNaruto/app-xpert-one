import { OfficeAddressListPage } from '@/features/master/office-address'
import { FACTORY_OFFICE_ADDRESS_SCREEN } from '../constants'

/** Factory / Statutory Office Address master — the factory inspectorate offices plants are registered with. */
export function FactoryOfficeAddressListPage() {
  return <OfficeAddressListPage screen={FACTORY_OFFICE_ADDRESS_SCREEN} />
}
