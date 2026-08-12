/**
 * IP Access Control — the module's public surface.
 *
 * One screen — the list, which also carries the company's access-mode header and
 * opens the add/edit form in a dialog over itself — plus the reads another
 * feature would need to state the mode. Cross-feature imports come through here,
 * never through a deep path.
 */
export { IpAddressListPage } from './pages/ip-address-list-page'

export { useIpAddresses } from './api/use-ip-addresses'
export { useIpAccessMode, useIpAccessModeGlobal } from './api/use-ip-access-mode'
export {
  useCreateIpAddress,
  useUpdateIpAddress,
  useDeleteIpAddress,
  useUpdateIpAccessMode,
} from './api/use-ip-address-mutations'

export { ipAddressTypeLabel } from './lib/ip-address-mappers'
export { IP_ADDRESS_TYPES } from './constants'

export type { IpAddress, IpAccessModeState } from './types'
export type { IpAccessMode, IpAddressType } from './schemas'
