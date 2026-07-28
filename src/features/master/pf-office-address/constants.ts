import type { ComboboxOption } from '@/components/ui/combobox'
import type { PfOfficeAddressFormValues } from './schemas'

/** How EPFO classifies the office. */
export const OFFICE_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Regional Office', value: 'Regional Office' },
  { label: 'Sub Regional Office', value: 'Sub Regional Office' },
]

/** Blank form values for a new PF office address. */
export const EMPTY_PF_OFFICE_ADDRESS_FORM: PfOfficeAddressFormValues = {
  officeName: '',
  officeCode: '',
  officeType: '',
  mobile: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  state: '',
  district: '',
  city: '',
  pinCode: '',
}
