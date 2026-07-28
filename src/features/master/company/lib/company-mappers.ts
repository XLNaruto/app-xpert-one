import type { CompanyFormValues } from '../schemas'
import type { Company } from '../types'

/** Hydrate the edit form from a stored company (nulls → empty strings). */
export function companyToFormValues(company: Company): CompanyFormValues {
  return {
    companyName: company.companyName,
    companyCode: company.companyCode,
    establishYear: company.establishYear,
    registrationNumber: company.registrationNumber ?? '',
    panNumber: company.panNumber,
    gstNumber: company.gstNumber ?? '',
    addressLine1: company.addressLine1,
    addressLine2: company.addressLine2 ?? '',
    addressLine3: company.addressLine3 ?? '',
    state: company.state,
    district: company.district ?? '',
    city: company.city ?? '',
    pinCode: company.pinCode ?? '',
    phone: company.phone ?? '',
    mobile1: company.mobile1,
    mobile2: company.mobile2 ?? '',
    email: company.email,
  }
}
