import type { LwfOfficeAddressFormValues } from './schemas'

/** Blank form values for a new LWF office address. */
export const EMPTY_LWF_OFFICE_ADDRESS_FORM: LwfOfficeAddressFormValues = {
  officeName: '',
  officeCode: '',
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
