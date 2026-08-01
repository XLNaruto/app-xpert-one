import { Building2 } from 'lucide-react'
import type { OfficeAddressScreen } from '@/features/master/office-address'

/**
 * What makes this one of the five office-address screens: the `office_for` it
 * reads from `/user/office-addresses`, its routes and its copy. The screens
 * themselves are the shared pages in `features/master/office-address`.
 */
export const PF_OFFICE_ADDRESS_SCREEN: OfficeAddressScreen = {
  officeFor: 'PF',
  listPath: '/master/pf-office-address',
  createPath: '/master/pf-office-address/create',
  title: 'PF Office Address',
  description: 'Manage the EPFO regional and sub-regional offices branches register with.',
  shortLabel: 'PF Address',
  recordsLabel: 'PF addresses',
  emptyTitle: 'No PF office addresses yet',
  emptyDescription: 'Add your first EPFO office to get started.',
  icon: Building2,
  hasOfficeType: true,
}
