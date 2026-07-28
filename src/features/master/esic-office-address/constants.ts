import type { EsicOfficeAddressFormValues } from './schemas'

/** Blank form values for a new ESIC office address. */
export const EMPTY_ESIC_OFFICE_ADDRESS_FORM: EsicOfficeAddressFormValues = {
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
