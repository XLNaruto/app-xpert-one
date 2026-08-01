import { OfficeAddressCreatePage } from '@/features/master/office-address'
import { EMPLOYMENT_EXCHANGE_OFFICE_ADDRESS_SCREEN } from '../constants'

interface EmploymentExchangeOfficeAddressCreatePageProps {
  /**
   * Encrypted office address id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/** Create/edit a EMPLOYMENT EXCHANGE office address. */
export function EmploymentExchangeOfficeAddressCreatePage({ data }: EmploymentExchangeOfficeAddressCreatePageProps) {
  return <OfficeAddressCreatePage screen={EMPLOYMENT_EXCHANGE_OFFICE_ADDRESS_SCREEN} data={data} />
}
