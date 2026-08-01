import { Building2 } from 'lucide-react'
import type { OfficeAddressScreen } from '@/features/master/office-address'

/**
 * What makes this one of the five office-address screens: the `office_for` it
 * reads from `/user/office-addresses`, its routes and its copy. The screens
 * themselves are the shared pages in `features/master/office-address`.
 */
export const FACTORY_OFFICE_ADDRESS_SCREEN: OfficeAddressScreen = {
  officeFor: 'FACTORY',
  listPath: '/master/factory-office-address',
  createPath: '/master/factory-office-address/create',
  title: 'Factory / Statutory Office Address',
  description: 'Manage the factory inspectorate offices plants are registered with.',
  shortLabel: 'Factory Address',
  recordsLabel: 'factory addresses',
  emptyTitle: 'No factory office addresses yet',
  emptyDescription: 'Add your first factory office to get started.',
  icon: Building2,
}
