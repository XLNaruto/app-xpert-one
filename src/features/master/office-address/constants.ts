import type { ComboboxOption } from '@/components/ui/combobox'
import type { OfficeAddressFormValues } from './schemas'

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
