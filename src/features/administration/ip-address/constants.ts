import type { ComboboxOption } from '@/components/ui/combobox'
import type { IpAddressFormValues } from './schemas'

/** Field labels, shared by the form, the filter and the list header. */
export const IP_ADDRESS_LABELS = {
  ipAddresses: 'IP Address / Range',
  type: 'List',
  mode: 'Access Mode',
} as const

/** The two lists an entry can sit on. */
export const IP_ADDRESS_TYPES: ComboboxOption[] = [
  { label: 'Allowed', value: 'ALLOWED' },
  { label: 'Blocked', value: 'BLOCKED' },
]

/** The filter dropdown — the same two lists, plus "both". */
export const IP_ADDRESS_TYPE_FILTERS: ComboboxOption[] = [
  { label: 'All Entries', value: '' },
  ...IP_ADDRESS_TYPES,
]

/**
 * The `sort` values `/user/ip-addresses` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const IP_ADDRESS_SORT = {
  ipAddresses: 'ip_addresses',
  type: 'type',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const

/**
 * Newest first. The endpoint's own default groups by list instead, but an order
 * is still sent explicitly: an unpinned order can repeat or skip rows between
 * pages.
 */
export const IP_ADDRESS_DEFAULT_SORT = {
  id: IP_ADDRESS_SORT.createdAt,
  desc: true,
}

/**
 * How often the access mode is re-asked while the app is open (30s). The mode is
 * mounted globally, so this is also how quickly a network barred *after* load
 * (`RESTRICTED_IP`) reaches an idle tab. Short enough that a lockout takes effect
 * promptly; long enough that one small request per half-minute is unremarkable.
 */
export const IP_ACCESS_MODE_POLL_MS = 30_000

/** Blank form values for a new entry — new addresses are usually allowances. */
export const EMPTY_IP_ADDRESS_FORM: IpAddressFormValues = {
  ipAddresses: '',
  type: 'ALLOWED',
}
