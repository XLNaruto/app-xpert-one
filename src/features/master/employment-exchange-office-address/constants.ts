import { Building2 } from 'lucide-react'
import type { OfficeAddressScreen } from '@/features/master/office-address'

/**
 * What makes this one of the five office-address screens: the `office_for` it
 * reads from `/user/office-addresses`, its routes and its copy. The screens
 * themselves are the shared pages in `features/master/office-address`.
 */
export const EMPLOYMENT_EXCHANGE_OFFICE_ADDRESS_SCREEN: OfficeAddressScreen = {
  officeFor: 'EMPLOYMENT EXCHANGE',
  listPath: '/master/employment-exchange-office-address',
  createPath: '/master/employment-exchange-office-address/create',
  title: 'Employment Exchange Office Address',
  description: 'Manage the employment exchange offices establishments file their returns with.',
  shortLabel: 'Employment Exchange Address',
  recordsLabel: 'employment exchange addresses',
  emptyTitle: 'No employment exchange office addresses yet',
  emptyDescription: 'Add your first employment exchange office to get started.',
  icon: Building2,
}
