/**
 * The office address master — one module behind five screens.
 *
 * `/user/office-addresses` stores PF, ESIC, LWF, Factory and Employment Exchange
 * offices in one collection, told apart by `office_for`. Each of those five
 * feature folders declares an `OfficeAddressScreen` and renders the pages here;
 * nothing about the API layer is duplicated per screen.
 */
export { OfficeAddressListPage } from './pages/office-address-list-page'
export { OfficeAddressCreatePage } from './pages/office-address-create-page'
export { useOfficeAddresses } from './api/use-office-addresses'
export { useOfficeAddress } from './api/use-office-address'
export { formatAddress } from './lib/office-address-mappers'
export { OFFICE_FOR_VALUES } from './types'
export type {
  OfficeAddress,
  OfficeAddressScreen,
  OfficeFor,
} from './types'
