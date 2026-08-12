import type { AuditFields } from '@/types/audit'
import type { IpAccessMode, IpAddressType } from '../schemas'

/** One IP access entry — a single host or a CIDR range on one of the two lists. */
export interface IpAddress extends AuditFields {
  id: number
  /** The company that owns the entry — every read is scoped to it. */
  companyId: number
  /** A host (`203.0.113.4`, `2001:db8::1`) or a range (`10.0.0.0/8`). */
  ipAddresses: string
  type: IpAddressType
}

/**
 * The company's access mode and what each list currently holds — the list
 * screen's header. The counts are what make the mode readable: `PUBLIC` with a
 * populated allow list is enforcing nothing.
 */
export interface IpAccessModeState {
  companyId: number
  mode: IpAccessMode
  allowedCount: number
  blockedCount: number
}
