import { Building2 } from 'lucide-react'
import type { OfficeAddressScreen } from '@/features/master/office-address'

/**
 * What makes this one of the five office-address screens: the `office_for` it
 * reads from `/user/office-addresses`, its routes and its copy. The screens
 * themselves are the shared pages in `features/master/office-address`.
 */
export const LWF_OFFICE_ADDRESS_SCREEN: OfficeAddressScreen = {
  officeFor: 'LWF',
  listPath: '/master/lwf-office-address',
  createPath: '/master/lwf-office-address/create',
  title: 'LWF Office Address',
  description: 'Manage the Labour Welfare Board Offices Establishments File Contributions With.',
  shortLabel: 'LWF Address',
  recordsLabel: 'LWF Addresses',
  emptyTitle: 'No LWF Office Addresses Yet',
  emptyDescription: 'Add Your First LWF Office to Get Started.',
  icon: Building2,
}
