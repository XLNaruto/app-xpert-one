import { Building2 } from 'lucide-react'
import type { OfficeAddressScreen } from '@/features/master/office-address'

/**
 * What makes this one of the five office-address screens: the `office_for` it
 * reads from `/user/office-addresses`, its routes and its copy. The screens
 * themselves are the shared pages in `features/master/office-address`.
 */
export const ESIC_OFFICE_ADDRESS_SCREEN: OfficeAddressScreen = {
  officeFor: 'ESIC',
  listPath: '/master/esic-office-address',
  createPath: '/master/esic-office-address/create',
  title: 'ESIC Office Address',
  description: 'Manage the ESIC Regional and Branch Offices Establishments Register With.',
  shortLabel: 'ESIC Address',
  recordsLabel: 'ESIC Addresses',
  emptyTitle: 'No ESIC Office Addresses Yet',
  emptyDescription: 'Add Your First ESIC Office to Get Started.',
  icon: Building2,
}
