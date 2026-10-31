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
  description: 'Manage the Employment Exchange Offices Establishments File Their Returns With.',
  shortLabel: 'Employment Exchange Address',
  recordsLabel: 'employment exchange addresses',
  emptyTitle: 'No Employment Exchange Office Addresses Yet',
  emptyDescription: 'Add Your First Employment Exchange Office to Get Started.',
  icon: Building2,
}
