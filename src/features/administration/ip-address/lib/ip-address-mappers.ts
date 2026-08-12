import type {
  IpAccessModeResponse,
  IpAddressFormValues,
  IpAddressResponse,
  IpAddressType,
  IpAddressUpdatePayload,
} from '../schemas'
import type { IpAccessModeState, IpAddress } from '../types'

/**
 * API record → the UI entry. The audit trail only comes back on the list rows;
 * on a single-record response it's absent and renders as a dash.
 */
export function toIpAddress(response: IpAddressResponse): IpAddress {
  return {
    id: response.id,
    companyId: response.company_id,
    ipAddresses: response.ip_addresses,
    type: response.type,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/** The mode response → the header's state. */
export function toIpAccessModeState(
  response: IpAccessModeResponse,
): IpAccessModeState {
  return {
    companyId: response.company_id,
    mode: response.ip_access_mode,
    allowedCount: response.allowed_count,
    blockedCount: response.blocked_count,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a record between
 * tenants, so the update body stops here.
 */
export function ipAddressToPayload(
  values: IpAddressFormValues,
): IpAddressUpdatePayload {
  return { ip_addresses: values.ipAddresses.trim(), type: values.type }
}

/** Hydrate the edit form from a stored entry. */
export function ipAddressToFormValues(entry: IpAddress): IpAddressFormValues {
  return { ipAddresses: entry.ipAddresses, type: entry.type }
}

/** How a list name reads on a badge or in a sentence. */
export function ipAddressTypeLabel(type: IpAddressType): string {
  return type === 'ALLOWED' ? 'Allowed' : 'Blocked'
}
