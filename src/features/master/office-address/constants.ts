import type { ComboboxOption } from '@/components/ui/combobox'
import type { OfficeAddressFormValues } from './schemas'

/**
 * The `sort` values `/user/office-addresses` accepts. Sorting is server-side, so
 * a column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const OFFICE_ADDRESS_SORT = {
  officeName: 'office_name',
  officeCode: 'office_code',
  city: 'city',
  createdAt: 'created_at',
} as const

/**
 * Newest office first — the order the list opens in and reverts to. Order is
 * always pinned to something: this screen walks every page of the endpoint
 * before filtering to its own `office_for`, and an unordered walk can repeat or
 * miss records between pages.
 */
export const OFFICE_ADDRESS_DEFAULT_SORT = {
  id: OFFICE_ADDRESS_SORT.createdAt,
  desc: true,
}

/** How EPFO classifies an office — the PF screen's Office Type dropdown. */
export const OFFICE_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Regional Office', value: 'Regional Office' },
  { label: 'Sub Regional Office', value: 'Sub Regional Office' },
]

/** Blank form values for a new office address. */
export const EMPTY_OFFICE_ADDRESS_FORM: OfficeAddressFormValues = {
  officeName: '',
  officeCode: '',
  officeType: '',
  mobile: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  stateId: '',
  districtId: '',
  city: '',
  pinCode: '',
}
