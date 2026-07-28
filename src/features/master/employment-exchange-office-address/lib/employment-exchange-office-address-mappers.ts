import type { EmploymentExchangeOfficeAddressFormValues } from '../schemas'
import type { EmploymentExchangeOfficeAddress } from '../types'

/** The user-editable half of a record — identity and audit fields are the API's. */
export type EmploymentExchangeOfficeAddressEditableFields = Omit<
  EmploymentExchangeOfficeAddress,
  'id' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'
>

/** Validated form values → the stored record's editable half. */
export function employmentExchangeOfficeAddressFromFormValues(
  values: EmploymentExchangeOfficeAddressFormValues,
): EmploymentExchangeOfficeAddressEditableFields {
  return { ...values }
}

/** Hydrate the edit form from a stored employment exchange office address. */
export function employmentExchangeOfficeAddressToFormValues(
  record: EmploymentExchangeOfficeAddress,
): EmploymentExchangeOfficeAddressFormValues {
  return {
    officeName: record.officeName,
    officeCode: record.officeCode,
    mobile: record.mobile,
    phone: record.phone,
    email: record.email,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    addressLine3: record.addressLine3,
    state: record.state,
    district: record.district,
    city: record.city,
    pinCode: record.pinCode,
  }
}

/** The address lines joined for a single-line table cell; blank → dash. */
export function formatAddress(record: EmploymentExchangeOfficeAddress): string {
  const parts = [
    record.addressLine1,
    record.addressLine2,
    record.addressLine3,
    record.city,
    record.pinCode,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
